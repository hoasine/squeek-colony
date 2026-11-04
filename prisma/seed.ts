import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.colony.upsert({
    where: { id: "lantern-hollow" },
    update: {},
    create: {
      id: "lantern-hollow",
      name: "Lantern Hollow",
      buildings: JSON.stringify({
        hearth: 2,
        workshop: 1,
        watchtower: 1,
        greenhouse: 1,
      }),
    },
  });
}

main()
  .then(() => console.log("Lantern Hollow is ready."))
  .finally(() => db.$disconnect());
