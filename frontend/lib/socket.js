import { io } from "socket.io-client";
import { SOCKET_URL } from "./constants";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const connectSocket = (role) => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
    s.on("connect", () => {
      console.log("Socket connected:", s.id);
      if (role) {
        s.emit("join_room", role);
      }
    });
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect();
  }
};