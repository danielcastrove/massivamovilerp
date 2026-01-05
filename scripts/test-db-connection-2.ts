// massivamovilerp/scripts/test-db-connection-2.ts
import { prisma } from '../src/lib/db.ts';

async function main() {
  console.log('--- Running Database Connection Test (Method 2) ---');
  try {
    console.log('Attempting to connect to the database using shared client...');
    const userCount = await prisma.user.count();
    console.log(`✅ Success! Found ${userCount} users in the database.`);
  } catch (e) {
    console.error('❌ Failed to connect to the database or execute query.');
    console.error(e);
    process.exit(1);
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
    console.log('--- Test Finished ---');
  });
