/*
  Warnings:

  - You are about to drop the column `roles` on the `Modulo` table. All the data in the column will be lost.
  - You are about to drop the column `modulo_id` on the `Role` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Modulo" DROP COLUMN "roles",
ADD COLUMN     "tipouser" JSONB;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "modulo_id";

-- CreateTable
CREATE TABLE "_ModuloToRole" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ModuloToRole_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ModuloToRole_B_index" ON "_ModuloToRole"("B");

-- AddForeignKey
ALTER TABLE "_ModuloToRole" ADD CONSTRAINT "_ModuloToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Modulo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ModuloToRole" ADD CONSTRAINT "_ModuloToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
