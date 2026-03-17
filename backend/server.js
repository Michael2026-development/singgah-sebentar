require("dotenv").config();
const http = require("http");
const app = require("./src/app");
const { initSocket } = require("./src/socket/index");
const logger = require("./src/utils/logger");

const PORT = process.env.PORT || 5001;

const server = http.createServer(app);

// Init Socket.io
initSocket(server);

server.listen(PORT, () => {
  logger.info(`🚀 Server berjalan di http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
  logger.info(`⚡ Socket.io ready`);
});

module.exports = server;