const { PrismaClient } = require("@prisma/client");
const { successResponse, errorResponse } = require("../utils/response");

const prisma = new PrismaClient();

// Laporan harian
const getDailyReport = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));

    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: start, lte: end },
        status: { in: ["delivered"] },
      },
      include: {
        orderItems: { include: { menu: { include: { category: true } } } },
        payment: true,
        table: true,
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrders = orders.length;
    const cashRevenue = orders
      .filter((o) => o.payment?.method === "cash")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const qrisRevenue = orders
      .filter((o) => o.payment?.method === "qris")
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    // Top menu
    const menuSales = {};
    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        const key = item.menuId;
        if (!menuSales[key]) {
          menuSales[key] = {
            id: item.menuId,
            name: item.menu?.name,
            category: item.menu?.category?.name,
            qty: 0,
            revenue: 0,
          };
        }
        menuSales[key].qty += item.quantity;
        menuSales[key].revenue += Number(item.subtotal);
      });
    });

    const topMenus = Object.values(menuSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Per jam
    const hourlyData = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      orders: 0,
      revenue: 0,
    }));
    orders.forEach((order) => {
      const hour = new Date(order.orderedAt).getHours();
      hourlyData[hour].orders += 1;
      hourlyData[hour].revenue += Number(order.totalAmount);
    });

    // Per zona meja
    const zoneData = {};
    orders.forEach((order) => {
      const zone = order.table?.zone || "unknown";
      if (!zoneData[zone]) zoneData[zone] = { zone, orders: 0, revenue: 0 };
      zoneData[zone].orders += 1;
      zoneData[zone].revenue += Number(order.totalAmount);
    });

    return successResponse(res, {
      date: start.toISOString().split("T")[0],
      summary: { totalRevenue, totalOrders, cashRevenue, qrisRevenue },
      topMenus,
      hourlyData: hourlyData.filter((h) => h.orders > 0),
      zoneData: Object.values(zoneData),
      orders,
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

// Laporan range (mingguan/bulanan)
const getRangeReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return errorResponse(res, "startDate dan endDate wajib diisi", 400);
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const orders = await prisma.order.findMany({
      where: {
        orderedAt: { gte: start, lte: end },
        status: { in: ["delivered"] },
      },
      include: {
        orderItems: { include: { menu: true } },
        payment: true,
        table: true,
      },
      orderBy: { orderedAt: "asc" },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalOrders = orders.length;

    // Per hari
    const dailyMap = {};
    orders.forEach((order) => {
      const day = order.orderedAt.toISOString().split("T")[0];
      if (!dailyMap[day]) dailyMap[day] = { date: day, orders: 0, revenue: 0 };
      dailyMap[day].orders += 1;
      dailyMap[day].revenue += Number(order.totalAmount);
    });

    // Top menu
    const menuSales = {};
    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        const key = item.menuId;
        if (!menuSales[key]) {
          menuSales[key] = { name: item.menu?.name, qty: 0, revenue: 0 };
        }
        menuSales[key].qty += item.quantity;
        menuSales[key].revenue += Number(item.subtotal);
      });
    });

    const topMenus = Object.values(menuSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return successResponse(res, {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      summary: { totalRevenue, totalOrders },
      dailyData: Object.values(dailyMap),
      topMenus,
    });
  } catch (err) {
    return errorResponse(res, err.message);
  }
};

module.exports = { getDailyReport, getRangeReport };