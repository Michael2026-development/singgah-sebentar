const tables = [];

// Lantai 1 - Indoor (Meja 1-20)
for (let i = 1; i <= 20; i++) {
  tables.push({
    tableNumber: i,
    floor: 1,
    zone: "indoor",
  });
}

// Lantai 1 - Outdoor (Meja 21-30)
for (let i = 21; i <= 30; i++) {
  tables.push({
    tableNumber: i,
    floor: 1,
    zone: "outdoor",
  });
}

// Lantai 2 - VIP (Meja 31-40)
for (let i = 31; i <= 40; i++) {
  tables.push({
    tableNumber: i,
    floor: 2,
    zone: "vip",
  });
}

module.exports = tables;
