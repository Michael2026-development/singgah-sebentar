const { getIO } = require("./index");
const logger = require("../utils/logger");

// Emit ke kasir saat ada pesanan baru masuk
const emitNewOrder = (order) => {
  try {
    const io = getIO();

    // Kirim ke room kasir dan owner/manager
    io.to("kasir").to("owner").to("manager").emit("new_order", {
      type: "new_order",
      message: `Pesanan baru dari Meja ${order.table.tableNumber}!`,
      order,
      timestamp: new Date(),
    });

    // Kirim ke customer di meja tersebut
    io.to(`table_${order.tableId}`).emit("customer_order_update", {
      type: "new_order",
      order,
      timestamp: new Date(),
    });

    logger.info(`Socket emitted: new_order - ${order.orderNumber}`);
  } catch (error) {
    logger.error("emitNewOrder error:", error);
  }
};

// Emit ke dapur saat pesanan dikonfirmasi kasir
const emitOrderConfirmed = (order) => {
  try {
    const io = getIO();

    io.to("dapur").to("kasir").to("owner").to("manager").emit("order_confirmed", {
      type: "order_confirmed",
      message: `Pesanan ${order.orderNumber} - Meja ${order.table.tableNumber} siap diproses!`,
      order,
      timestamp: new Date(),
    });

    // Kirim ke customer di meja tersebut
    io.to(`table_${order.tableId}`).emit("customer_order_update", {
      type: "order_confirmed",
      order,
      timestamp: new Date(),
    });

    logger.info(`Socket emitted: order_confirmed - ${order.orderNumber}`);
  } catch (error) {
    logger.error("emitOrderConfirmed error:", error);
  }
};

// Emit ke semua saat status order berubah
const emitOrderStatusUpdate = (order) => {
  try {
    const io = getIO();

    io.to("kasir").to("dapur").to("owner").to("manager").emit("order_status_update", {
      type: "order_status_update",
      message: `Pesanan ${order.orderNumber} - Status: ${order.status}`,
      order,
      timestamp: new Date(),
    });

    // Kirim ke customer di meja tersebut
    io.to(`table_${order.tableId}`).emit("customer_order_update", {
      type: "order_status_update",
      order,
      timestamp: new Date(),
    });

    logger.info(`Socket emitted: order_status_update - ${order.orderNumber} → ${order.status}`);
  } catch (error) {
    logger.error("emitOrderStatusUpdate error:", error);
  }
};

// Emit ke kasir saat pembayaran dikonfirmasi
const emitPaymentConfirmed = (payment, order) => {
  try {
    const io = getIO();

    io.to("kasir").to("owner").to("manager").emit("payment_confirmed", {
      type: "payment_confirmed",
      message: `Pembayaran ${payment.method.toUpperCase()} Order ${order.orderNumber} berhasil!`,
      payment,
      order,
      timestamp: new Date(),
    });

    // Kirim ke customer di meja tersebut
    io.to(`table_${order.tableId}`).emit("customer_order_update", {
      type: "payment_confirmed",
      payment,
      order,
      timestamp: new Date(),
    });

    logger.info(`Socket emitted: payment_confirmed - Order ${order.orderNumber}`);
  } catch (error) {
    logger.error("emitPaymentConfirmed error:", error);
  }
};

module.exports = {
  emitNewOrder,
  emitOrderConfirmed,
  emitOrderStatusUpdate,
  emitPaymentConfirmed,
};