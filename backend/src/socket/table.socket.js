const { getIO } = require("./index");
const logger = require("../utils/logger");

// Emit ke kasir, owner, manager saat status meja berubah
const emitTableStatusUpdate = (table) => {
  try {
    const io = getIO();

    io.to("kasir").to("owner").to("manager").emit("table_status_update", {
      type: "table_status_update",
      message: `Meja ${table.tableNumber} status: ${table.status}`,
      table,
      timestamp: new Date(),
    });

    logger.info(`Socket emitted: table_status_update - Meja ${table.tableNumber} → ${table.status}`);
  } catch (error) {
    logger.error("emitTableStatusUpdate error:", error);
  }
};

module.exports = { emitTableStatusUpdate };
