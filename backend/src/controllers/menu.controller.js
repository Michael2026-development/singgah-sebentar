const { PrismaClient } = require("@prisma/client");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

const prisma = new PrismaClient();

const getAllMenus = async (req, res) => {
  try {
    const { category, search, isAvailable } = req.query;

    const where = { isActive: true };

    if (category) {
      where.category = { slug: category };
    }

    if (search) {
      where.name = { contains: search };
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === "true";
    }

    const menus = await prisma.menu.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, slug: true, icon: true } },
        variations: { where: { isActive: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return successResponse(res, menus, "Menu berhasil diambil");
  } catch (error) {
    logger.error("GetAllMenus error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const getMenuById = async (req, res) => {
  try {
    const { id } = req.params;

    const menu = await prisma.menu.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: true,
        variations: { where: { isActive: true } },
      },
    });

    if (!menu) {
      return errorResponse(res, "Menu tidak ditemukan", 404);
    }

    return successResponse(res, menu, "Menu berhasil diambil");
  } catch (error) {
    logger.error("GetMenuById error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const createMenu = async (req, res) => {
  try {
    const { categoryId, name, description, basePrice, isAvailable, isSeasonal, variations } = req.body;

    if (!categoryId || !name || !basePrice) {
      return errorResponse(res, "Kategori, nama, dan harga wajib diisi", 400);
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const menu = await prisma.menu.create({
      data: {
        categoryId: parseInt(categoryId),
        name,
        description,
        basePrice: parseFloat(basePrice),
        imageUrl,
        isAvailable: isAvailable !== undefined ? isAvailable === "true" : true,
        isSeasonal: isSeasonal === "true",
        variations: variations ? {
          create: JSON.parse(variations),
        } : undefined,
      },
      include: { category: true, variations: true },
    });

    return successResponse(res, menu, "Menu berhasil dibuat", 201);
  } catch (error) {
    logger.error("CreateMenu error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryId, name, description, basePrice, isAvailable, isSeasonal, isActive } = req.body;

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const menu = await prisma.menu.update({
      where: { id: parseInt(id) },
      data: {
        ...(categoryId && { categoryId: parseInt(categoryId) }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(basePrice && { basePrice: parseFloat(basePrice) }),
        ...(imageUrl && { imageUrl }),
        ...(isAvailable !== undefined && { isAvailable: isAvailable === "true" }),
        ...(isSeasonal !== undefined && { isSeasonal: isSeasonal === "true" }),
        ...(isActive !== undefined && { isActive: isActive === "true" }),
      },
      include: { category: true, variations: true },
    });

    return successResponse(res, menu, "Menu berhasil diupdate");
  } catch (error) {
    logger.error("UpdateMenu error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const toggleMenuAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const menu = await prisma.menu.findUnique({ where: { id: parseInt(id) } });
    if (!menu) {
      return errorResponse(res, "Menu tidak ditemukan", 404);
    }

    const updated = await prisma.menu.update({
      where: { id: parseInt(id) },
      data: { isAvailable: !menu.isAvailable },
    });

    const status = updated.isAvailable ? "tersedia" : "habis";
    return successResponse(res, updated, `Menu ditandai sebagai ${status}`);
  } catch (error) {
    logger.error("ToggleMenu error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.menu.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return successResponse(res, null, "Menu berhasil dihapus");
  } catch (error) {
    logger.error("DeleteMenu error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

module.exports = {
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  toggleMenuAvailability,
  deleteMenu,
};