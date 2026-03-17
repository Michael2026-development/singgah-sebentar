const { PrismaClient } = require("@prisma/client");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");
const { emitTableStatusUpdate } = require("../socket/table.socket");

const prisma = new PrismaClient();

const getAllTables = async (req, res) => {
  try {
    const { zone, floor, isActive } = req.query;

    const where = {};

    if (zone) where.zone = zone;
    if (floor) where.floor = parseInt(floor);
    if (isActive !== undefined) where.isActive = isActive === "true";

    const tables = await prisma.table.findMany({
      where,
      orderBy: { tableNumber: "asc" },
    });

    return successResponse(res, tables, "Data meja berhasil diambil");
  } catch (error) {
    logger.error("GetAllTables error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const getTableById = async (req, res) => {
  try {
    const { id } = req.params;

    const table = await prisma.table.findUnique({
      where: { id: parseInt(id) },
    });

    if (!table) {
      return errorResponse(res, "Meja tidak ditemukan", 404);
    }

    return successResponse(res, table, "Data meja berhasil diambil");
  } catch (error) {
    logger.error("GetTableById error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const getTableByNumber = async (req, res) => {
  try {
    const { number } = req.params;

    const table = await prisma.table.findUnique({
      where: { tableNumber: parseInt(number) },
    });

    if (!table) {
      return errorResponse(res, "Meja tidak ditemukan", 404);
    }

    if (!table.isActive) {
      return errorResponse(res, "Meja tidak aktif", 400);
    }

    return successResponse(res, table, "Data meja berhasil diambil");
  } catch (error) {
    logger.error("GetTableByNumber error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const createTable = async (req, res) => {
  try {
    const { tableNumber, floor, zone } = req.body;

    if (!tableNumber || !zone) {
      return errorResponse(res, "Nomor meja dan zona wajib diisi", 400);
    }

    const existing = await prisma.table.findUnique({
      where: { tableNumber: parseInt(tableNumber) },
    });

    if (existing) {
      return errorResponse(res, "Nomor meja sudah digunakan", 400);
    }

    const qrCodeUrl = `${process.env.CLIENT_URL}/menu/${tableNumber}`;

    const table = await prisma.table.create({
      data: {
        tableNumber: parseInt(tableNumber),
        floor: parseInt(floor) || 1,
        zone,
        qrCodeUrl,
      },
    });

    return successResponse(res, table, "Meja berhasil dibuat", 201);
  } catch (error) {
    logger.error("CreateTable error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, floor, zone, isActive } = req.body;

    const qrCodeUrl = tableNumber
      ? `${process.env.CLIENT_URL}/menu/${tableNumber}`
      : undefined;

    const table = await prisma.table.update({
      where: { id: parseInt(id) },
      data: {
        ...(tableNumber && { tableNumber: parseInt(tableNumber) }),
        ...(floor && { floor: parseInt(floor) }),
        ...(zone && { zone }),
        ...(isActive !== undefined && { isActive: isActive === "true" || isActive === true }),
        ...(qrCodeUrl && { qrCodeUrl }),
      },
    });

    return successResponse(res, table, "Meja berhasil diupdate");
  } catch (error) {
    logger.error("UpdateTable error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.table.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return successResponse(res, null, "Meja berhasil dinonaktifkan");
  } catch (error) {
    logger.error("DeleteTable error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

// Toggle status meja (kasir manual set available/occupied)
const updateTableStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["available", "occupied"];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, "Status tidak valid. Gunakan 'available' atau 'occupied'", 400);
    }

    const table = await prisma.table.findUnique({
      where: { id: parseInt(id) },
    });

    if (!table) {
      return errorResponse(res, "Meja tidak ditemukan", 404);
    }

    const updatedTable = await prisma.table.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    logger.info(`Table status update: Meja ${table.tableNumber} → ${status}`);
    emitTableStatusUpdate(updatedTable);
    return successResponse(res, updatedTable, `Status meja diubah ke ${status}`);
  } catch (error) {
    logger.error("UpdateTableStatus error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

module.exports = {
  getAllTables,
  getTableById,
  getTableByNumber,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
};