/*
  Warnings:

  - You are about to drop the `_ModuloToRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ModuloToRole" DROP CONSTRAINT "_ModuloToRole_A_fkey";

-- DropForeignKey
ALTER TABLE "_ModuloToRole" DROP CONSTRAINT "_ModuloToRole_B_fkey";

-- DropTable
DROP TABLE "_ModuloToRole";

-- CreateTable
CREATE TABLE "ModuloToRole" (
    "module_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT NOT NULL,

    CONSTRAINT "ModuloToRole_pkey" PRIMARY KEY ("module_id","role_id")
);

-- AddForeignKey
ALTER TABLE "ModuloToRole" ADD CONSTRAINT "ModuloToRole_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Modulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuloToRole" ADD CONSTRAINT "ModuloToRole_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
