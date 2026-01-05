/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `PriceList` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PriceList_name_key" ON "PriceList"("name");
