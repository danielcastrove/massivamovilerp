-- AlterTable: Add type column to Payment table
ALTER TABLE "Payment" ADD COLUMN "type" VARCHAR(10) NOT NULL DEFAULT 'FACTURA';