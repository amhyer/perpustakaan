/**
 * Standalone WebSocket server entry point.
 *
 * Run with: npx tsx scripts/websocket-server.ts
 * Or:       node --import tsx scripts/websocket-server.ts
 *
 * Production: pakai PM2, systemd, atau container terpisah.
 *
 * Environment variables:
 * - WS_PORT: port untuk listen (default: 3003)
 * - JWT_SECRET: required untuk auth
 * - WS_WEBHOOK_SECRET: secret untuk /webhook endpoint
 */

import { startWebSocketServer } from "../src/lib/websocket-server";

const PORT = parseInt(process.env.WS_PORT || "3003", 10);

if (!process.env.JWT_SECRET) {
  console.error("ERROR: JWT_SECRET environment variable is required");
  console.error("Set it in your .env file or export it before running.");
  process.exit(1);
}

console.log(`Starting WebSocket server on port ${PORT}...`);
const { server } = startWebSocketServer();

function shutdown(signal: string) {
  console.log(`\nReceived ${signal}, shutting down...`);
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
  // Force exit setelah 5 detik
  setTimeout(() => {
    console.error("Forced shutdown");
    process.exit(1);
  }, 5_000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

console.log(`Health check: http://localhost:${PORT}/health`);
console.log(`Stats: http://localhost:${PORT}/stats`);
console.log(`Webhook: POST http://localhost:${PORT}/webhook`);
