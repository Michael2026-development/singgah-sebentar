const { PrismaClient } = require("@prisma/client");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

const prisma = new PrismaClient();

const getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: req.query.all ? {} : { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { menus: true } },
      },
    });

    return successResponse(res, categories, "Kategori berhasil diambil");
  } catch (error) {
    logger.error("GetAllCategories error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const createCategory = async (req, res) => {
  try {
    const { name, slug, icon, sortOrder } = req.body;

    if (!name || !slug) {
      return errorResponse(res, "Nama dan slug wajib diisi", 400);
    }

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return errorResponse(res, "Slug sudah digunakan", 400);
    }

    const category = await prisma.category.create({
      data: { name, slug, icon, sortOrder: sortOrder || 0 },
    });

    return successResponse(res, category, "Kategori berhasil dibuat", 201);
  } catch (error) {
    logger.error("CreateCategory error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, icon, sortOrder, isActive } = req.body;

    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name, slug, icon, sortOrder, isActive },
    });

    return successResponse(res, category, "Kategori berhasil diupdate");
  } catch (error) {
    logger.error("UpdateCategory error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const menuCount = await prisma.menu.count({
      where: { categoryId: parseInt(id) },
    });

    if (menuCount > 0) {
      return errorResponse(res, "Kategori tidak bisa dihapus karena masih memiliki menu", 400);
    }

    await prisma.category.delete({ where: { id: parseInt(id) } });

    return successResponse(res, null, "Kategori berhasil dihapus");
  } catch (error) {
    logger.error("DeleteCategory error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};


const toggleCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.category.findUnique({ where: { id: parseInt(id) } });
    if (!category) return errorResponse(res, "Kategori tidak ditemukan", 404);
    const updated = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { isActive: !category.isActive },
    });
    return successResponse(res, updated, "Status kategori berhasil diubah");
  } catch (error) {
    logger.error("ToggleCategory error:", error);
    return errorResponse(res, "Terjadi kesalahan", 500);
  }
};

module.exports = { getAllCategories, createCategory, updateCategory, deleteCategory, toggleCategory };
