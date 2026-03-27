const { PrismaClient } = require("@prisma/client");
const { successResponse, errorResponse } = require("../utils/response");
const generateOrderNumber = require("../utils/generateOrderNumber");
const logger = require("../utils/logger");
const { emitNewOrder, emitOrderConfirmed, emitOrderStatusUpdate } = require("../socket/order.socket");
const { emitTableStatusUpdate } = require("../socket/table.socket");
const prisma = new PrismaClient();

const createOrder = async (req, res) => {
  try {
    const { tableId, paymentMethod, items } = req.body;

    if (!tableId || !paymentMethod || !items || items.length === 0) {
      return errorResponse(res, "Data pesanan tidak lengkap", 400);
    }

    // Validasi meja
    const table = await prisma.table.findUnique({
      where: { id: parseInt(tableId) },
    });

    if (!table || !table.isActive) {
      return errorResponse(res, "Meja tidak ditemukan atau tidak aktif", 404);
    }

    // Cek apakah ada pesanan aktif yang belum selesai untuk meja ini hari ini
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeOrder = await prisma.order.findFirst({
      where: {
        tableId: parseInt(tableId),
        orderedAt: { gte: today },
        status: { notIn: ["delivered", "cancelled"] },
      },
    });

    if (activeOrder) {
      return errorResponse(
        res,
        "Pesanan sebelumnya belum selesai. Silakan tunggu pesanan saat ini selesai untuk memesan lagi.",
        400
      );
    }

    // Hitung total & validasi menu
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menu = await prisma.menu.findUnique({
        where: { id: parseInt(item.menuId) },
      });

      if (!menu || !menu.isActive || !menu.isAvailable) {
        return errorResponse(res, `Menu ${item.menuId} tidak tersedia`, 400);
      }

      const unitPrice = parseFloat(menu.basePrice);
      const subtotal = unitPrice * parseInt(item.quantity);
      totalAmount += subtotal;

      orderItems.push({
        menuId: parseInt(item.menuId),
        quantity: parseInt(item.quantity),
        unitPrice,
        subtotal,
        size: item.size || null,
        temperature: item.temperature || null,
        sweetness: item.sweetness || null,
        spiciness: item.spiciness || null,
        toppings: item.toppings || null,
        specialNote: item.specialNote || null,
      });
    }

    // Hitung session round (berapa kali meja ini order hari ini)
    const sessionRound = await prisma.order.count({
      where: {
        tableId: parseInt(tableId),
        orderedAt: { gte: today },
      },
    }) + 1;

    // Apply 6% Service Tax
    const serviceTax = totalAmount * 0.06;
    totalAmount += serviceTax;

    // Buat order
    const order = await prisma.order.create({
      data: {
        tableId: parseInt(tableId),
        orderNumber: generateOrderNumber(),
        status: "pending",
        totalAmount,
        paymentMethod,
        sessionRound,
        orderItems: { create: orderItems },
        payment: {
          create: {
            method: paymentMethod,
            amount: totalAmount,
            status: "pending",
          },
        },
      },
      include: {
        table: true,
        orderItems: { include: { menu: true } },
        payment: true,
      },
    });

    // Update status meja ke occupied
    const updatedTable = await prisma.table.update({
      where: { id: parseInt(tableId) },
      data: { status: "occupied" },
    });

    logger.info(`Order baru: ${order.orderNumber} - Meja ${table.tableNumber}`);
    emitNewOrder(order);
    emitTableStatusUpdate(updatedTable);
    return successResponse(res, order, "Pesanan berhasil dibuat", 201);
  } catch (error) {
    logger.error("CreateOrder error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

// Public endpoint: cek pesanan aktif di meja tertentu
const getActiveOrdersByTable = async (req, res) => {
  try {
    const { tableId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeOrders = await prisma.order.findMany({
      where: {
        tableId: parseInt(tableId),
        orderedAt: { gte: today },
        status: { notIn: ["cancelled"] },
      },
      include: {
        table: true,
        orderItems: { include: { menu: true } },
        payment: true,
      },
      orderBy: { orderedAt: "desc" },
    });

    return successResponse(res, activeOrders, "Data pesanan aktif berhasil diambil");
  } catch (error) {
    logger.error("GetActiveOrdersByTable error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const getAllOrders = async (req, res) => {
  try {
    const { status, tableId, date } = req.query;

    const where = {};

    if (status) where.status = status;
    if (tableId) where.tableId = parseInt(tableId);
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.orderedAt = { gte: start, lte: end };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        orderItems: { include: { menu: true } },
        payment: true,
        confirmedByUser: { select: { id: true, name: true } },
      },
      orderBy: { orderedAt: "desc" },
    });

    return successResponse(res, orders, "Data pesanan berhasil diambil");
  } catch (error) {
    logger.error("GetAllOrders error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: {
        table: true,
        orderItems: { include: { menu: true } },
        payment: true,
        confirmedByUser: { select: { id: true, name: true } },
      },
    });

    if (!order) {
      return errorResponse(res, "Pesanan tidak ditemukan", 404);
    }

    return successResponse(res, order, "Detail pesanan berhasil diambil");
  } catch (error) {
    logger.error("GetOrderById error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const confirmOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({ where: { id: parseInt(id) } });

    if (!order) {
      return errorResponse(res, "Pesanan tidak ditemukan", 404);
    }

    if (order.status !== "pending") {
      return errorResponse(res, "Pesanan sudah dikonfirmasi sebelumnya", 400);
    }

    const updated = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        status: "confirmed",
        confirmedBy: req.user.id,
      },
      include: {
        table: true,
        orderItems: { include: { menu: true } },
        payment: true,
      },
    });

    logger.info(`Order dikonfirmasi: ${order.orderNumber} oleh ${req.user.name}`);
    emitOrderConfirmed(updated);
    return successResponse(res, updated, "Pesanan berhasil dikonfirmasi");
  } catch (error) {
    logger.error("ConfirmOrder error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["confirmed", "preparing", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, "Status tidak valid", 400);
    }

    const data = { status };
    if (status === "delivered") {
      data.deliveredAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data,
      include: {
        table: true,
        orderItems: { include: { menu: true } },
        payment: true,
      },
    });

    // Jangan otomatis set meja ke available saat delivered
    // Kasir akan manual set meja ke available saat customer pergi
    if (status === "confirmed") {
      const updatedTable = await prisma.table.update({
        where: { id: order.tableId },
        data: { status: "occupied" },
      });
      emitTableStatusUpdate(updatedTable);
    } else if (status === "cancelled") {
      const updatedTable = await prisma.table.update({
        where: { id: order.tableId },
        data: { status: "available" },
      });
      emitTableStatusUpdate(updatedTable);
    }

    logger.info(`Order status update: ${order.orderNumber} → ${status}`);
    emitOrderStatusUpdate(order);
    return successResponse(res, order, `Status pesanan diupdate ke ${status}`);
  } catch (error) {
    logger.error("UpdateOrderStatus error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getActiveOrdersByTable,
  confirmOrder,
  updateOrderStatus,
};