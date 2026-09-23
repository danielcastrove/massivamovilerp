import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getAllowedModulePaths } from '@/lib/navigation';

// Define the shape of the module links we want to return
interface ModuleLink {
    name: string;
    path: string;
    icon?: string | null;
}

export async function GET() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const allowedModulePaths = await getAllowedModulePaths(session.user.id, session.user.role);

    const allowedModules = await prisma.modulo.findMany({
      where: { path: { in: allowedModulePaths } },
      orderBy: { name: 'asc' },
    });

    // Transform the full module objects into the desired ModuleLink shape, including the icon
    const moduleLinks: ModuleLink[] = allowedModules.map(m => ({
        name: m.name,
        path: m.path || '/',
        icon: m.icon, // Now includes the icon from the Modulo model
    }));

    return NextResponse.json(moduleLinks);

  } catch (error) {
    console.error('Error fetching navigation modules:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
