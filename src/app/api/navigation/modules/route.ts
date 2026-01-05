import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { UserRole, Modulo } from '@prisma/client';

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
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        roles: {
          include: {
            modulos: {
                include: {
                    modulo: true
                }
            },
          },
        },
      },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    let allowedModules: Modulo[] = [];

    switch (user.role) {
      case UserRole.MASSIVA_ADMIN:
        allowedModules = await prisma.modulo.findMany({ orderBy: { name: 'asc' }});
        break;

      case UserRole.MASSIVA_EXTRA:
        if (user.roles && user.roles.modulos) {
          allowedModules = user.roles.modulos.map(m2r => m2r.modulo);
        }
        break;

      case UserRole.CLIENTE:
        const clientModules = await prisma.modulo.findMany();
        allowedModules = clientModules.filter(m => {
            try {
                const userTypes = JSON.parse((m.tipouser as string) || '[]');
                return Array.isArray(userTypes) && userTypes.includes(UserRole.CLIENTE);
            } catch {
                return false;
            }
        });
        break;
        
      default:
        allowedModules = [];
        break;
    }

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
