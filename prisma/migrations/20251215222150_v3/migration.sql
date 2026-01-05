/*
  Warnings:

  - You are about to drop the column `tipouser` on the `Modulo` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Role` table. All the data in the column will be lost.
  - The `modulo_id` column on the `Role` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_modulo_id_fkey";

-- AlterTable
ALTER TABLE "Modulo" DROP COLUMN "tipouser",
ADD COLUMN     "roles" JSONB;

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "user_id",
DROP COLUMN "modulo_id",
ADD COLUMN     "modulo_id" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roles_id" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roles_id_fkey" FOREIGN KEY ("roles_id") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
