/**
 * WebSocket Server — True bidirectional real-time communication.
 *
 * Standalone Node.js server (runs alongside Next.js).
 * Architecture:
 * - Port terpisah dari Next.js (default: 3003)
 * - Auth via JWT cookie atau session token
 * - Subscribe to event bus dari Next.js via HTTP POST webhook
 * - Broadcast ke semua client yang sesuai
 *
 * Use cases:
 * - Real-time chat (librarian ↔ student)
 * - Presence (siapa yang online)
 * - Typing indicators
 * - Live collaboration (multiple user edit wishlist, dll)
 *
 * Untuk development: jalankan dengan `npx tsx src/lib/websocket-server.ts`
 * Untuk production: pakai PM2 atau systemd, atau deploy terpisah.
 *
 * Note: Next.js App Router tidak support WebSocket di server actions.
 * Cara ini stand-alone WS server adalah pattern yang umum dipakai.
 *
 * Limitasi: scaling ke multi-instance butuh Redis pub/sub.
 */

import { createServer, IncomingMessage } from "http";
import { parse as parseUrl } from "url";
import { logger } from "@/lib/logger";
import WebSocket from "ws";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const wsModule = require("ws");
const WebSocketServer = wsModule.WebSocketServer;
type RawData = Buffer | ArrayBuffer | Buffer[];

// ===== Types =====

interface WSClient {
  id: string;
  userId: string | null;
  memberId: string | null;
  role: string | null;
  channels: Set<string>;
  isAlive: boolean;
  lastPing: number;
  metadata: Map<string, any>;
  readyState: number;
  send: (data: string) => void;
  terminate: () => void;
  ping: () => void;
}

interface WSMessage {
  type: string;
  id?: string;
  channel?: string;
  data?: any;
  replyTo?: string;
}

interface ChannelAuth {
  userId: string;
  memberId?: string;
  role: string;
  name: string;
}

const PORT = parseInt(process.env.WS_PORT || "3003", 10);
const HEARTBEAT_INTERVAL = 30_000; // 30s
const MAX_MESSAGE_SIZE = 64 * 1024; // 64KB
const CHANNELS = {
  GLOBAL: "global",
  USER: (id: string) => `user:${id}`,
  MEMBER: (id: string) => `member:${id}`,
  ROLE: (role: string) => `role:${role}`,
  ROOM: (id: string) => `room:${id}`,
} as const;

// ===== Connection Registry =====

const clients = new Map<string, WSClient>();
const channelMembers = new Map<string, Set<string>>(); // channel -> clientIds

function addToChannel(clientId: string, channel: string) {
  if (!channelMembers.has(channel)) {
    channelMembers.set(channel, new Set());
  }
  channelMembers.get(channel)!.add(clientId);
}

function removeFromChannel(clientId: string, channel: string) {
  channelMembers.get(channel)?.delete(clientId);
}

function removeFromAllChannels(clientId: string) {
  for (const [channel, members] of channelMembers.entries()) {
    if (members.has(clientId)) {
      members.delete(clientId);
      if (members.size === 0) {
        channelMembers.delete(channel);
      }
    }
  }
}

// ===== Auth (simplified) =====

/**
 * Parse session token from cookie or Authorization header.
 * Simplified version — in production, verify JWT signature properly.
 */
function authenticate(req: IncomingMessage): ChannelAuth | null {
  try {
    // 1. Try cookie
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/ji_session=([^;]+)/);
    const token = match ? match[1] : null;

    // 2. Try Authorization header (Bearer)
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    const sessionToken = token || bearerToken;
    if (!sessionToken) return null;

    // Verify JWT (jose library available)
    // Note: dynamic import untuk avoid bundling issues
    const { jwtVerify } = require("jose");
    const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "");
    return jwtVerify(sessionToken, SECRET).then(
      (result: any) => ({
        userId: result.payload.userId,
        role: result.payload.role,
        name: result.payload.name,
      })
    ) as any;
  } catch (err) {
    return null;
  }
}

// Async wrapper untuk auth
async function authenticateAsync(req: IncomingMessage): Promise<ChannelAuth | null> {
  try {
    const cookieHeader = req.headers.cookie || "";
    const match = cookieHeader.match(/ji_session=([^;]+)/);
    const token = match ? match[1] : null;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const sessionToken = token || bearerToken;
    if (!sessionToken) return null;

    const { jwtVerify } = require("jose");
    if (!process.env.JWT_SECRET) return null;
    const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
    const result = await jwtVerify(sessionToken, SECRET);
    return {
      userId: result.payload.userId as string,
      role: (result.payload.role as string) || "STUDENT",
      name: (result.payload.name as string) || "User",
    };
  } catch {
    return null;
  }
}

// ===== Message Handlers =====

async function handleMessage(client: WSClient, raw: RawData) {
  let msg: WSMessage;
  try {
    const text = raw.toString();
    if (text.length > MAX_MESSAGE_SIZE) {
      sendError(client, "Message too large");
      return;
    }
    msg = JSON.parse(text);
  } catch {
    sendError(client, "Invalid JSON");
    return;
  }

  if (!msg.type) {
    sendError(client, "Missing type");
    return;
  }

  switch (msg.type) {
    case "ping":
      // Respond with pong
      sendToClient(client, { type: "pong", id: msg.id });
      break;

    case "subscribe":
      handleSubscribe(client, msg);
      break;

    case "unsubscribe":
      handleUnsubscribe(client, msg);
      break;

    case "publish":
      handlePublish(client, msg);
      break;

    case "broadcast":
      // Only librarians can broadcast
      if (client.role !== "LIBRARIAN" && client.role !== "PUSTAKAWAN_JUNIOR") {
        sendError(client, "Forbidden: only librarians can broadcast", 403);
        return;
      }
      handleBroadcast(client, msg);
      break;

    case "direct":
      // Send to specific user
      handleDirect(client, msg);
      break;

    case "presence":
      // Get online users
      handlePresence(client, msg);
      break;

    case "typing":
      // Typing indicator (chat)
      handleTyping(client, msg);
      break;

    default:
      sendError(client, `Unknown type: ${msg.type}`);
  }
}

function handleSubscribe(client: WSClient, msg: WSMessage) {
  if (!msg.channel) {
    sendError(client, "Missing channel");
    return;
  }
  // Validate channel access
  if (!canAccessChannel(client, msg.channel)) {
    sendError(client, `Forbidden: cannot subscribe to ${msg.channel}`, 403);
    return;
  }
  client.channels.add(msg.channel);
  addToChannel(client.id, msg.channel);
  sendToClient(client, {
    type: "subscribed",
    channel: msg.channel,
    id: msg.id,
  });
  logger.debug("WS subscribe", { clientId: client.id, channel: msg.channel });
}

function handleUnsubscribe(client: WSClient, msg: WSMessage) {
  if (!msg.channel) return;
  client.channels.delete(msg.channel);
  removeFromChannel(client.id, msg.channel);
  sendToClient(client, {
    type: "unsubscribed",
    channel: msg.channel,
    id: msg.id,
  });
}

function handlePublish(client: WSClient, msg: WSMessage) {
  if (!msg.channel || !msg.data) {
    sendError(client, "Missing channel or data");
    return;
  }
  if (!canAccessChannel(client, msg.channel)) {
    sendError(client, `Forbidden: cannot publish to ${msg.channel}`, 403);
    return;
  }
  // Publish ke semua subscriber di channel
  broadcastToChannel(msg.channel, {
    type: "event",
    channel: msg.channel,
    data: msg.data,
    from: {
      userId: client.userId,
      memberId: client.memberId,
      role: client.role,
    },
    timestamp: new Date().toISOString(),
  });
}

function handleBroadcast(client: WSClient, msg: WSMessage) {
  if (!msg.data) {
    sendError(client, "Missing data");
    return;
  }
  // Broadcast ke SEMUA connected client
  broadcastToAll({
    type: "event",
    channel: CHANNELS.GLOBAL,
    data: msg.data,
    from: {
      userId: client.userId,
      memberId: client.memberId,
      role: client.role,
    },
    timestamp: new Date().toISOString(),
  });
}

function handleDirect(client: WSClient, msg: WSMessage) {
  if (!msg.data?.targetUserId) {
    sendError(client, "Missing targetUserId");
    return;
  }
  const targetChannel = CHANNELS.USER(msg.data.targetUserId);
  broadcastToChannel(targetChannel, {
    type: "direct",
    channel: targetChannel,
    data: {
      ...msg.data,
      from: {
        userId: client.userId,
        memberId: client.memberId,
        role: client.role,
      },
    },
    timestamp: new Date().toISOString(),
  });
}

function handlePresence(client: WSClient, _msg: WSMessage) {
  // Get list of online users
  const onlineUsers: { userId: string; role: string; channels: string[] }[] = [];
  for (const c of clients.values()) {
    if (c.userId) {
      onlineUsers.push({
        userId: c.userId,
        role: c.role || "STUDENT",
        channels: Array.from(c.channels),
      });
    }
  }
  sendToClient(client, {
    type: "presence",
    data: { count: onlineUsers.length, users: onlineUsers },
    id: _msg.id,
  });
}

function handleTyping(client: WSClient, msg: WSMessage) {
  if (!msg.data?.targetUserId) {
    sendError(client, "Missing targetUserId");
    return;
  }
  const targetChannel = CHANNELS.USER(msg.data.targetUserId);
  broadcastToChannel(targetChannel, {
    type: "typing",
    channel: targetChannel,
    data: {
      from: {
        userId: client.userId,
        memberId: client.memberId,
        role: client.role,
        name: client.metadata.get("name") || "User",
      },
      context: msg.data.context || "general",
    },
    timestamp: new Date().toISOString(),
  });
}

// ===== Access Control =====

function canAccessChannel(client: WSClient, channel: string): boolean {
  // Global channel — everyone
  if (channel === CHANNELS.GLOBAL) return true;

  // User-specific channel
  if (channel.startsWith("user:")) {
    const targetUserId = channel.slice(5);
    // User can access their own channel; librarian can access all
    if (client.userId === targetUserId) return true;
    if (client.role === "LIBRARIAN" || client.role === "PUSTAKAWAN_JUNIOR") return true;
    return false;
  }

  // Member-specific channel
  if (channel.startsWith("member:")) {
    const targetMemberId = channel.slice(7);
    if (client.memberId === targetMemberId) return true;
    if (client.role === "LIBRARIAN" || client.role === "PUSTAKAWAN_JUNIOR") return true;
    return false;
  }

  // Role-specific channel
  if (channel.startsWith("role:")) {
    const targetRole = channel.slice(5);
    return client.role === targetRole || client.role === "LIBRARIAN";
  }

  // Room channel — check if user is member of room
  if (channel.startsWith("room:")) {
    return true; // simplified — production: check room membership
  }

  return false;
}

// ===== Send Helpers =====

function sendToClient(client: WSClient, msg: any) {
  if (client.readyState === WebSocket.OPEN) {
    try {
      client.send(JSON.stringify(msg));
    } catch (err) {
      logger.warn("WS send failed", { clientId: client.id, error: String(err) });
    }
  }
}

function sendError(client: WSClient, message: string, code: number = 400) {
  sendToClient(client, {
    type: "error",
    code,
    message,
    timestamp: new Date().toISOString(),
  });
}

function broadcastToChannel(channel: string, msg: any) {
  const members = channelMembers.get(channel);
  if (!members) return;
  for (const clientId of members) {
    const client = clients.get(clientId);
    if (client) sendToClient(client, msg);
  }
}

function broadcastToAll(msg: any) {
  for (const client of clients.values()) {
    sendToClient(client, msg);
  }
}

// ===== HTTP Webhook (untuk Next.js → WS) =====

/**
 * Internal API untuk Next.js mengirim event ke WS server.
 * Dipanggil dari API routes saat ada event baru.
 *
 * POST /webhook
 * { channel: "user:abc", data: { type: "...", ... } }
 *
 * Auth via shared secret.
 */
function setupWebhook(server: ReturnType<typeof createServer>) {
  server.on("request", async (req, res) => {
    if (req.url === "/webhook" && req.method === "POST") {
      // Check secret
      const authHeader = req.headers.authorization;
      const expectedAuth = `Bearer ${(() => { const s = process.env.WS_WEBHOOK_SECRET; if (!s) throw new Error("WS_WEBHOOK_SECRET harus diset"); return s; })()}`;
      if (authHeader !== expectedAuth) {
        res.writeHead(401);
        res.end("Unauthorized");
        return;
      }

      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const { channel, data, broadcast } = JSON.parse(body);
          if (broadcast) {
            broadcastToAll({
              type: "event",
              channel,
              data,
              timestamp: new Date().toISOString(),
            });
          } else if (channel) {
            broadcastToChannel(channel, {
              type: "event",
              channel,
              data,
              timestamp: new Date().toISOString(),
            });
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, clients: clients.size }));
        } catch (err) {
          res.writeHead(400);
          res.end("Bad request");
        }
      });
      return;
    }

    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          clients: clients.size,
          channels: channelMembers.size,
          uptime: process.uptime(),
        })
      );
      return;
    }

    if (req.url === "/stats") {
      const stats = {
        clients: clients.size,
        channels: channelMembers.size,
        channelBreakdown: Object.fromEntries(
          Array.from(channelMembers.entries()).map(([c, m]) => [c, m.size])
        ),
        roles: Array.from(clients.values()).reduce((acc, c) => {
          const r = c.role || "unknown";
          acc[r] = (acc[r] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(stats));
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });
}

// ===== Connection Lifecycle =====

function generateClientId(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function handleConnection(ws: any, req: IncomingMessage) {
  const client = ws as WSClient;
  client.id = generateClientId();
  client.userId = null;
  client.memberId = null;
  client.role = null;
  client.channels = new Set();
  client.isAlive = true;
  client.lastPing = Date.now();
  client.metadata = new Map();

  clients.set(client.id, client);
  logger.info("WS connected", { clientId: client.id, total: clients.size });

  // Auth (if cookie present)
  const auth = await authenticateAsync(req);
  if (auth) {
    client.userId = auth.userId;
    client.role = auth.role;
    client.metadata.set("name", auth.name);
    // Auto-subscribe to user's own channel + role channel
    const userChannel = CHANNELS.USER(auth.userId);
    client.channels.add(userChannel);
    addToChannel(client.id, userChannel);
    if (auth.role) {
      const roleChannel = CHANNELS.ROLE(auth.role);
      client.channels.add(roleChannel);
      addToChannel(client.id, roleChannel);
    }
    // Optionally subscribe to global
    if (auth.role === "LIBRARIAN" || auth.role === "PUSTAKAWAN_JUNIOR") {
      client.channels.add(CHANNELS.GLOBAL);
      addToChannel(client.id, CHANNELS.GLOBAL);
    }
  }

  // Welcome message
  sendToClient(client, {
    type: "welcome",
    clientId: client.id,
    authenticated: !!auth,
    user: auth
      ? { userId: auth.userId, role: auth.role, name: auth.name }
      : null,
    channels: Array.from(client.channels),
    serverTime: new Date().toISOString(),
  });

  // Notify others about new presence
  if (auth) {
    broadcastToChannel(CHANNELS.GLOBAL, {
      type: "presence:join",
      data: {
        userId: auth.userId,
        role: auth.role,
        name: auth.name,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Message handler
  ws.on("message", (data) => {
    client.lastPing = Date.now();
    handleMessage(client, data).catch((err) => {
      logger.error("WS message handler error", { error: String(err) });
    });
  });

  // Pong
  ws.on("pong", () => {
    client.isAlive = true;
    client.lastPing = Date.now();
  });

  // Close
  ws.on("close", () => {
    handleDisconnect(client, auth);
  });

  // Error
  ws.on("error", (err) => {
    logger.error("WS error", { clientId: client.id, error: String(err) });
  });
}

function handleDisconnect(client: WSClient, auth: ChannelAuth | null) {
  removeFromAllChannels(client.id);
  clients.delete(client.id);
  logger.info("WS disconnected", { clientId: client.id, total: clients.size });

  if (auth) {
    broadcastToChannel(CHANNELS.GLOBAL, {
      type: "presence:leave",
      data: {
        userId: auth.userId,
        role: auth.role,
        name: auth.name,
      },
      timestamp: new Date().toISOString(),
    });
  }
}

// ===== Heartbeat =====

function startHeartbeat(wss: any) {
  setInterval(() => {
    const now = Date.now();
    for (const client of clients.values()) {
      // If no pong received in 60s, terminate
      if (now - client.lastPing > 60_000) {
        logger.warn("WS client timeout, terminating", { clientId: client.id });
        client.terminate();
        continue;
      }
      // Ping if isAlive is false
      if (!client.isAlive) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      try {
        client.ping();
      } catch {
        // ignore
      }
    }
  }, HEARTBEAT_INTERVAL);
}

// ===== Server Start =====

export function startWebSocketServer() {
  const server = createServer();
  const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_SIZE });

  wss.on("connection", handleConnection);
  setupWebhook(server);
  startHeartbeat(wss);

  server.listen(PORT, () => {
    logger.info(`[WS] WebSocket server listening on port ${PORT}`);
    logger.info(`[WS] Webhook endpoint: http://localhost:${PORT}/webhook`);
    logger.info(`[WS] Health check: http://localhost:${PORT}/health`);
  });

  return { server, wss };
}

// Auto-start when run directly (not when imported)
if (require.main === module) {
  if (!process.env.JWT_SECRET) {
    logger.error("[WS] JWT_SECRET not set, aborting");
    process.exit(1);
  }
  startWebSocketServer();
}

// Export helpers untuk testing
export const __test = {
  broadcastToChannel,
  broadcastToAll,
  sendToClient,
  clients,
  channelMembers,
  canAccessChannel,
  CHANNELS,
};

// Export CHANNELS for client code
export { CHANNELS };
