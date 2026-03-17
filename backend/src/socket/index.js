const { Server } = require("socket.io");
const logger = require("../utils/logger");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join room berdasarkan role (kasir, dapur, owner, manager)
    socket.on("join_room", (room) => {
      socket.join(room);
      logger.info(`Socket ${socket.id} joined room: ${room}`);
    });

    // Join table room (customer)
    socket.on("join_table", (tableId) => {
      const room = `table_${tableId}`;
      socket.join(room);
      logger.info(`Socket ${socket.id} joined table room: ${room}`);
    });

    // Leave room
    socket.on("leave_room", (room) => {
      socket.leave(room);
      logger.info(`Socket ${socket.id} left room: ${room}`);
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info("✅ Socket.io initialized");
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io belum diinisialisasi");
  }
  return io;
};

module.exports = { initSocket, getIO };