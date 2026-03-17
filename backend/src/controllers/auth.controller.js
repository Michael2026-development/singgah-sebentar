const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

const prisma = new PrismaClient();

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validasi input
    if (!email || !password) {
      return errorResponse(res, "Email dan password wajib diisi", 400);
    }

    // Cari user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return errorResponse(res, "Email atau password salah", 401);
    }

    // Cek user aktif
    if (!user.isActive) {
      return errorResponse(res, "Akun tidak aktif, hubungi admin", 403);
    }

    // Verifikasi password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse(res, "Email atau password salah", 401);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    logger.info(`User login: ${user.email} (${user.role})`);

    return successResponse(res, {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    }, "Login berhasil");

  } catch (error) {
    logger.error("Login error:", error);
    return errorResponse(res, "Terjadi kesalahan saat login", 500);
  }
};

const logout = async (req, res) => {
  try {
    // Di production, token bisa di-blacklist di Redis
    // Untuk sekarang, client cukup hapus token dari storage
    logger.info(`User logout: ${req.user?.email}`);
    return successResponse(res, null, "Logout berhasil");
  } catch (error) {
    logger.error("Logout error:", error);
    return errorResponse(res, "Terjadi kesalahan saat logout", 500);
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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

    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    return successResponse(res, user, "Data user berhasil diambil");
  } catch (error) {
    logger.error("GetMe error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

module.exports = { login, logout, getMe };