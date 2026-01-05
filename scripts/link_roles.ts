console.log('--- Running modified link_roles.ts to test DB connection ---');
import { prisma } from '../src/lib/db.ts';

// --- Configuration ---
// Define which modules belong to which role.
// The script will find the IDs for these names and link them.
const roleModuleMappings = {
  'Semi Administrador': [
    // Leave this array empty to assign ALL modules to this role
  ],
  'Vendedor': [
    'Cobranzas (Collections)', 
    'Facturación (Invoicing)'
  ],
};

async function main() {
  console.log('--- Starting script to link roles to modules ---');

  // 1. Fetch all roles and modules from the database
  const allRoles = await prisma.role.findMany();
  const allModules = await prisma.modulo.findMany();
  
  if (allRoles.length === 0 || allModules.length === 0) {
    console.error('Error: No roles or modules found in the database. Please create them first.');
    return;
  }

  // Create a quick lookup map for names to IDs
  const roleMap = new Map(allRoles.map(r => [r.name, r.id]));
  const moduleMap = new Map(allModules.map(m => [m.name, m.id]));

  // 2. Iterate through the mapping configuration
  for (const roleName in roleModuleMappings) {
    const roleId = roleMap.get(roleName);
    if (!roleId) {
      console.warn(`- Role "${roleName}" not found in database. Skipping.`);
      continue;
    }

    console.log(`
Processing role: "${roleName}" (ID: ${roleId})`);

    let modulesToLink = roleModuleMappings[roleName as keyof typeof roleModuleMappings];

    // If the module list is empty, it means "link all modules" (for Semi Administrador)
    if (modulesToLink.length === 0 && roleName === 'Semi Administrador') {
        modulesToLink = allModules.map(m => m.name);
        console.log('  -> Assigning ALL modules to Semi Administrador.');
    }

    // 3. For each module name, find its ID and create the link
    for (const moduleName of modulesToLink) {
      const moduleId = moduleMap.get(moduleName);
      if (!moduleId) {
        console.warn(`  - Module "${moduleName}" not found for role "${roleName}". Skipping.`);
        continue;
      }

      // 4. Use upsert to create the link in the join table
      // This prevents errors if the link already exists.
      try {
        await prisma.moduloToRole.upsert({
          where: {
            module_id_role_id: { // This is the composite key defined with @@id
              module_id: moduleId,
              role_id: roleId,
            },
          },
          update: {
            // No fields to update, we just want to ensure it exists
          },
          create: {
            role_id: roleId,
            module_id: moduleId,
            assigned_by: 'system_script', // Identifier for who made this link
          },
        });
        console.log(`  ✅ Successfully linked to module: "${moduleName}"`);
      } catch (e) {
        console.error(`  ❌ Failed to link to module: "${moduleName}". Error:`, e);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n--- Script finished ---');
  });
