"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/core/auth/context";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      // 从localStorage获取token
      const token = localStorage.getItem('iot_platform_access_token');
      if (!token) return;

      // 连接到后端WebSocket服务
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000';
      const newSocket = io(wsUrl, {
        path: "/socket.io",
        auth: {
          token,
        },
        transports: ["websocket", "polling"],
        timeout: 20000,
        forceNew: true,
      });

      newSocket.on("connect", () => {
        console.log("WebSocket connected");
        setIsConnected(true);
      });

      newSocket.on("disconnect", () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
      });

      newSocket.on("connect_error", (error) => {
        console.error("WebSocket connection error:", error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
