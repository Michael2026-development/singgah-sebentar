const bcrypt = require("bcryptjs");

const getUsers = async () => {
  const password = await bcrypt.hash("singgah2026", 10);

  return [
    {
      name: "Kevin Owner",
      email: "owner@singgahsebentar.id",
      passwordHash: password,
      role: "owner",
      phone: "081234567890",
    },
    {
      name: "Manager Singgah",
      email: "manager@singgahsebentar.id",
      passwordHash: password,
      role: "manager",
      phone: "081234567891",
    },
    {
      name: "Kasir Satu",
      email: "kasir@singgahsebentar.id",
      passwordHash: password,
      role: "kasir",
      phone: "081234567892",
    },
    {
      name: "Staff Dapur",
      email: "dapur@singgahsebentar.id",
      passwordHash: password,
      role: "dapur",
      phone: "081234567893",
    },
  ];
};

module.exports = getUsers;
