import { prisma } from "../src/lib/db.ts";

const nameFilter = process.argv[2] || 'entcorp';
const customers = await prisma.customer.findMany({
  where: { name: { contains: nameFilter, mode: 'insensitive' } },
  select: { id: true, name: true, telefono_celular: true, telefono_empresa: true, email: true },
});
console.log(JSON.stringify(customers, null, 2));
await prisma.$disconnect();
