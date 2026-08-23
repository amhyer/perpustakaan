"use client";

/**
 * Live Chat View — Real-time chat between users via WebSocket.
 *
 * Features:
 * - Bidirectional real-time messaging
 * - Typing indicators
 * - Online presence
 * - Reconnect handling
 * - Message history (in-memory only for this demo)
 *
 * Use cases:
 * - Student ↔ Librarian chat (help desk)
 * - Group chat per class
 * - Reading club discussion
 *
 * Architecture:
 * - Uses useWebSocket hook
 * - Subscribes to user channel for incoming messages
 * - Subscribes to global channel for presence updates
 */

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Send,
  Wifi,
  WifiOff,
  Users,
  Loader2,
  Circle,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Input } from "@/components/ui/form/input";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";
import { useAppStore } from "@/store/use-app-store";

interface ChatMessage {
  id: string;
  from: { userId: string; memberId?: string; role: string; name?: string };
  text: string;
  timestamp: string;
  isOwn?: boolean;
}

interface OnlineUser {
  userId: string;
  role: string;
  name?: string;
  joinedAt: string;
}

interface LiveChatViewProps {
  /** Target user ID for 1-on-1 chat. If null, broadcast to global. */
  targetUserId?: string;
  /** Channel name (default: "global" or "user:USER_ID") */
  channel?: string;
  /** Title shown in header */
  title?: string;
  className?: string;
}

export function LiveChatView({
  targetUserId,
  channel: channelProp,
  title = "Chat Real-time",
  className,
}: LiveChatViewProps) {
  const user = useAppStore((s) => s.user);
  const channel = channelProp || (targetUserId ? `user:${targetUserId}` : "global");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: NodeJS.Timeout }>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [showPresence, setShowPresence] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const { status, isConnected, send, publish, subscribe } = useWebSocket({
    debug: false,
    onEvent: (msg) => {
      // Handle various event types
      if (msg.type === "event" && msg.channel === "global" && msg.data?.type === "presence:join") {
        setOnlineUsers((prev) => {
          if (prev.find((u) => u.userId === msg.data.userId)) return prev;
          return [
            ...prev,
            {
              userId: msg.data.userId,
              role: msg.data.role,
              name: msg.data.name,
              joinedAt: msg.timestamp || new Date().toISOString(),
            },
          ];
        });
      } else if (msg.type === "presence:leave" || (msg.type === "event" && msg.data?.type === "presence:leave")) {
        const data = msg.data || msg;
        setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      } else if (msg.type === "presence") {
        setOnlineUsers(
          (msg.data?.users || []).map((u: any) => ({
            userId: u.userId,
            role: u.role,
            joinedAt: new Date().toISOString(),
          }))
        );
      }
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to channel and presence
  useEffect(() => {
    if (!isConnected) return;

    const unsubChannel = subscribe(channel, (data) => {
      if (data?.text && data?.from) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${data.from.userId}-${Date.now()}-${Math.random()}`,
            from: data.from,
            text: data.text,
            timestamp: data.timestamp || new Date().toISOString(),
            isOwn: data.from.userId === user?.id,
          },
        ]);
      }
    });

    // Subscribe to global for presence
    const unsubPresence = subscribe("global", (data) => {
      if (data?.type === "presence:join" && data.userId) {
        setOnlineUsers((prev) => {
          if (prev.find((u) => u.userId === data.userId)) return prev;
          return [
            ...prev,
            {
              userId: data.userId,
              role: data.role,
              name: data.name,
              joinedAt: new Date().toISOString(),
            },
          ];
        });
      } else if (data?.type === "presence:leave" && data.userId) {
        setOnlineUsers((prev) => prev.filter((u) => u.userId !== data.userId));
      }
    });

    // Subscribe to typing indicators
    const unsubTyping = subscribe(channel, (data) => {
      // Typing events are sent to a different channel via direct, but we can detect
      if (data?.from && data?.context === "typing") {
        setTypingUsers((prev) => {
          const next = new Map(prev);
          const existing = next.get(data.from.userId);
          if (existing?.timeout) clearTimeout(existing.timeout);
          const timeout = setTimeout(() => {
            setTypingUsers((p) => {
              const n = new Map(p);
              n.delete(data.from.userId);
              return n;
            });
          }, 3_000);
          next.set(data.from.userId, { name: data.from.name || "User", timeout });
          return next;
        });
      }
    });

    // Request current presence
    send({ type: "presence" });

    return () => {
      unsubChannel();
      unsubPresence();
      unsubTyping();
    };
  }, [isConnected, channel, subscribe, send, user?.id]);

  // Send message
  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text || !isConnected || !user) return;
    setInput("");

    // Optimistic add
    const newMsg: ChatMessage = {
      id: `own-${Date.now()}`,
      from: {
        userId: user.id,
        memberId: user.member?.id,
        role: user.role,
        name: user.name,
      },
      text,
      timestamp: new Date().toISOString(),
      isOwn: true,
    };
    setMessages((prev) => [...prev, newMsg]);

    // Publish to channel
    publish(channel, {
      type: "chat",
      text,
      from: {
        userId: user.id,
        memberId: user.member?.id,
        role: user.role,
        name: user.name,
      },
      timestamp: newMsg.timestamp,
    });
  }, [input, isConnected, user, channel, publish]);

  // Typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!isTypingRef.current && user && isConnected) {
      isTypingRef.current = true;
      send({
        type: "typing",
        data: {
          targetUserId: targetUserId,
          context: "typing",
        },
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 2_000);
  };

  // Handle enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format time
  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className={cn("flex flex-col h-[600px]", className)}>
      <CardHeader className="border-b py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowPresence(!showPresence)}
              className="h-7 px-2"
            >
              <Users className="h-4 w-4 mr-1" />
              <span className="text-xs">{onlineUsers.length}</span>
            </Button>
            <ConnectionIndicator status={status} isConnected={isConnected} />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Channel: <code className="px-1 bg-muted rounded">{channel}</code>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex p-0 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Belum ada pesan. Mulai percakapan! 👋
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  currentUserId={user?.id}
                  formatTime={formatTime}
                />
              ))
            )}
            {/* Typing indicators */}
            {typingUsers.size > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground px-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>
                  {Array.from(typingUsers.values())
                    .map((u) => u.name)
                    .join(", ")}{" "}
                  sedang mengetik...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isConnected ? "Ketik pesan..." : "Menyambungkan..."}
              disabled={!isConnected}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!input.trim() || !isConnected} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Presence sidebar */}
        {showPresence && (
          <div className="w-56 border-l bg-muted/30 p-3 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Online ({onlineUsers.length})
            </h3>
            {onlineUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada user online</p>
            ) : (
              <ul className="space-y-1">
                {onlineUsers.map((u) => (
                  <li
                    key={u.userId}
                    className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted"
                  >
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                    <span className="flex-1 truncate">{u.name || u.userId.slice(0, 8)}</span>
                    <span className="text-muted-foreground">{u.role}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MessageBubble({
  message,
  currentUserId,
  formatTime,
}: {
  message: ChatMessage;
  currentUserId?: string;
  formatTime: (iso: string) => string;
}) {
  const isOwn = message.from.userId === currentUserId;
  return (
    <div className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
          isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
        )}
      >
        {!isOwn && message.from.name && (
          <div className="text-xs font-semibold mb-0.5 opacity-80">
            {message.from.name}
            <span className="ml-1 px-1 bg-black/10 rounded text-[10px]">
              {message.from.role}
            </span>
          </div>
        )}
        <div className="whitespace-pre-wrap break-words">{message.text}</div>
        <div
          className={cn(
            "text-[10px] mt-1",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

function ConnectionIndicator({
  status,
  isConnected,
}: {
  status: string;
  isConnected: boolean;
}) {
  const getStatus = () => {
    if (isConnected) {
      return { icon: Wifi, color: "text-green-600", label: "Online" };
    }
    if (status === "connecting") {
      return { icon: Loader2, color: "text-amber-600", label: "Connecting..." };
    }
    return { icon: WifiOff, color: "text-red-600", label: "Offline" };
  };
  const s = getStatus();
  const Icon = s.icon;
  return (
    <div className={cn("flex items-center gap-1 text-xs", s.color)}>
      <Icon className={cn("h-3 w-3", status === "connecting" && "animate-spin")} />
      <span className="hidden sm:inline">{s.label}</span>
    </div>
  );
}
