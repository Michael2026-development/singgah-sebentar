const { PrismaClient } = require("@prisma/client");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");
const { emitPaymentConfirmed } = require("../socket/order.socket");
const prisma = new PrismaClient();

const getPaymentByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;
    const payment = await prisma.payment.findUnique({
      where: { orderId: parseInt(orderId) },
      include: {
        order: {
          include: {
            table: true,
            orderItems: { include: { menu: true } },
          },
        },
      },
    });
    if (!payment) return errorResponse(res, "Data pembayaran tidak ditemukan", 404);
    return successResponse(res, payment, "Data pembayaran berhasil diambil");
  } catch (error) {
    logger.error("GetPaymentByOrderId error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const confirmCashPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerPhone } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { orderId: parseInt(orderId) },
    });
    if (!payment) return errorResponse(res, "Data pembayaran tidak ditemukan", 404);
    if (payment.status === "paid") return errorResponse(res, "Pembayaran sudah dikonfirmasi sebelumnya", 400);
    if (payment.method !== "cash") return errorResponse(res, "Metode pembayaran bukan cash", 400);

    const updatedPayment = await prisma.payment.update({
      where: { orderId: parseInt(orderId) },
      data: {
        status: "paid",
        customerPhone: customerPhone || null,
        paidAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { status: "preparing" },
    });

    const orderData = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { table: true },
    });
    emitPaymentConfirmed(updatedPayment, orderData);

    logger.info(`Cash payment confirmed: Order #${orderId}`);
    return successResponse(res, updatedPayment, "Pembayaran cash berhasil dikonfirmasi");
  } catch (error) {
    logger.error("ConfirmCashPayment error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const confirmQrisPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { qrisRefNumber, customerPhone } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { orderId: parseInt(orderId) },
    });
    if (!payment) return errorResponse(res, "Data pembayaran tidak ditemukan", 404);
    if (payment.status === "paid") return errorResponse(res, "Pembayaran sudah dikonfirmasi sebelumnya", 400);
    if (payment.method !== "qris") return errorResponse(res, "Metode pembayaran bukan QRIS", 400);

    const updatedPayment = await prisma.payment.update({
      where: { orderId: parseInt(orderId) },
      data: {
        status: "paid",
        qrisRefNumber: qrisRefNumber || null,
        customerPhone: customerPhone || null,
        paidAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { status: "preparing" },
    });

    const orderData = await prisma.order.findUnique({
      where: { id: parseInt(orderId) },
      include: { table: true },
    });
    emitPaymentConfirmed(updatedPayment, orderData);

    logger.info(`QRIS payment confirmed: Order #${orderId}`);
    return successResponse(res, updatedPayment, "Pembayaran QRIS berhasil dikonfirmasi");
  } catch (error) {
    logger.error("ConfirmQrisPayment error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const getAllPayments = async (req, res) => {
  try {
    const { status, method, date } = req.query;
    const where = {};
    if (status) where.status = status;
    if (method) where.method = method;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where.paidAt = { gte: start, lte: end };
    }
    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: { include: { table: true } },
      },
      orderBy: { id: "desc" },
    });
    return successResponse(res, payments, "Data pembayaran berhasil diambil");
  } catch (error) {
    logger.error("GetAllPayments error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

module.exports = {
  getPaymentByOrderId,
  confirmCashPayment,
  confirmQrisPayment,
  getAllPayments,
};