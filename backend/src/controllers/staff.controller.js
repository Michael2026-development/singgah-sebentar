const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

const prisma = new PrismaClient();

// GET semua staff
const getAllStaff = async (req, res) => {
  try {
    const staff = await prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });
    return successResponse(res, staff, "Data staff berhasil diambil");
  } catch (err) {
    logger.error("GetAllStaff error:", err);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

// POST buat staff baru
const createStaff = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return errorResponse(res, "Semua field wajib diisi", 400);
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return errorResponse(res, "Email sudah terdaftar", 400);

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash: hashed, role },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return successResponse(res, user, "Staff berhasil dibuat", 201);
  } catch (err) {
    logger.error("CreateStaff error:", err);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

// PUT update staff
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, password, isActive } = req.body;

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return successResponse(res, user, "Staff berhasil diupdate");
  } catch (err) {
    logger.error("UpdateStaff error:", err);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

// DELETE staff
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    // Cegah hapus diri sendiri
    if (parseInt(id) === req.user.id) {
      return errorResponse(res, "Tidak bisa menghapus akun sendiri", 400);
    }

    await prisma.user.delete({ where: { id: parseInt(id) } });
    return successResponse(res, null, "Staff berhasil dihapus");
  } catch (err) {
    logger.error("DeleteStaff error:", err);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

// PATCH toggle aktif/nonaktif
const toggleStaffActive = async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return errorResponse(res, "Tidak bisa menonaktifkan akun sendiri", 400);
    }

    const staff = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (!staff) return errorResponse(res, "Staff tidak ditemukan", 404);

    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: !staff.isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    return successResponse(res, updated, `Staff ${updated.isActive ? "diaktifkan" : "dinonaktifkan"}`);
  } catch (err) {
    logger.error("ToggleStaffActive error:", err);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

module.exports = { getAllStaff, createStaff, updateStaff, deleteStaff, toggleStaffActive };