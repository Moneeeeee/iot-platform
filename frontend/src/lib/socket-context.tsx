"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./auth-context";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && token) {
      const newSocket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "", {
        auth: {
          token,
        },
        transports: ["websocket"],
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
  }, [isAuthenticated, token]);

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
