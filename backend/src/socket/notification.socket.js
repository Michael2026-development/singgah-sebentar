const { getIO } = require("./index");
const logger = require("../utils/logger");

const emitNotification = (room, type, message, data = {}) => {
  try {
    const io = getIO();

    io.to(room).emit("notification", {
      type,
      message,
      data,
      timestamp: new Date(),
    });

    logger.info(`Notification emitted to ${room}: ${type}`);
  } catch (error) {
    logger.error("emitNotification error:", error);
  }
};

module.exports = { emitNotification };