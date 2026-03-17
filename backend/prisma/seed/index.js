const { PrismaClient } = require("@prisma/client");
const categories = require("./categories.seed");
const tables = require("./tables.seed");
const getUsers = require("./users.seed");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Mulai seeding database...\n");

  // Seed Categories
  console.log("📂 Seeding categories...");
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
  }
  console.log(`✅ ${categories.length} kategori berhasil dibuat\n`);

  // Seed Tables
  console.log("🪑 Seeding tables...");
  for (const table of tables) {
    await prisma.table.upsert({
      where: { tableNumber: table.tableNumber },
      update: {},
      create: table,
    });
  }
  console.log(`✅ ${tables.length} meja berhasil dibuat\n`);

  // Seed Users
  console.log("👤 Seeding users...");
  const users = await getUsers();
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }
  console.log(`✅ ${users.length} user berhasil dibuat\n`);

  console.log("🎉 Seeding selesai!");
  console.log("\n📋 Default login credentials:");
  console.log("   Owner   : owner@singgahsebentar.id");
  console.log("   Manager : manager@singgahsebentar.id");
  console.log("   Kasir   : kasir@singgahsebentar.id");
  console.log("   Dapur   : dapur@singgahsebentar.id");
  console.log("   Password: singgah2026");
}

main()
  .catch((e) => {
    console.error("❌ Seeding gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
