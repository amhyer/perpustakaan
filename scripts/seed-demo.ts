import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 10);

  const lib = await db.user.upsert({
    where: { email: "pustakawan@jendelailmu.sch.id" },
    update: {},
    create: {
      email: "pustakawan@jendelailmu.sch.id",
      passwordHash: hash,
      name: "Pustakawan",
      role: "LIBRARIAN",
    },
  });
  console.log("Librarian:", lib.email);

  const teacher = await db.user.upsert({
    where: { email: "budi@jendelailmu.sch.id" },
    update: {},
    create: {
      email: "budi@jendelailmu.sch.id",
      passwordHash: hash,
      name: "Budi",
      role: "TEACHER",
    },
  });
  console.log("Teacher:", teacher.email);

  const student = await db.user.upsert({
    where: { email: "andini@jendelailmu.sch.id" },
    update: {},
    create: {
      email: "andini@jendelailmu.sch.id",
      passwordHash: hash,
      name: "Andini",
      role: "STUDENT",
    },
  });
  console.log("Student:", student.email);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
