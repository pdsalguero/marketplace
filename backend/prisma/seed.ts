import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // usuario admin de prueba
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {}, // si ya existe, no lo modifica
    create: {
      name: "Admin",
      email: "admin@test.com",
      password: passwordHash,
    },
  });

  console.log("✅ Usuario admin creado (admin@test.com / admin123)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
