-- CreateTable
CREATE TABLE "TasaBcv" (
    "id" TEXT NOT NULL,
    "tasa" DECIMAL(10,4) NOT NULL,
    "fecha_efectiva" DATE NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TasaBcv_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TasaBcv_fecha_efectiva_key" ON "TasaBcv"("fecha_efectiva");
