-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MASSIVA_ADMIN', 'MASSIVA_EXTRA', 'CLIENTE');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('PERSONA', 'EMPRESA');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('J', 'V', 'E', 'P', 'G');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('RECURRENT', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'BIMONTHLY');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('FACTURA', 'RECIBO');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESET', 'BLOCKED', 'PAUSED');

-- CreateEnum
CREATE TYPE "Rubro" AS ENUM ('TELECOMUNICACIONES', 'SEGUROS', 'MASCOTTAS', 'COBRANZAS', 'ALIMENTOS_Y_BEBIDAS', 'FERRETERIA_Y_CONSTRUCCION', 'FARMACIA', 'AUTOPARTES', 'AGRICOLA', 'TECNOLOGIA', 'SERVICIOS', 'SOFTWARE', 'ROPA', 'ZAPATOS', 'HOGAR_Y_MUEBLES', 'PERFUMES', 'RELOJES_JOYAS_Y_BISUTERIA', 'ARTE', 'PAPELERIA_Y_MERCERIA', 'DEPORTES_Y_FITNESS', 'ESTETICA_Y_BELLEZA', 'LICORES', 'ENVITE_Y_AZAR', 'OTRO');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('MAYOR', 'DETAL', 'MAYOR_Y_DETAL');

-- CreateEnum
CREATE TYPE "LegalFigure" AS ENUM ('PERSONA_JURIDICA', 'GOBIERNO_EMPRENDEDOR_CON_FIRMA_PERSONAL', 'EMPRENDEDOR_SOLO_CON_RIF');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('EMPRESA', 'FABRICANTE', 'PRODUCTOR', 'DISTRIBUIDORA', 'MAYORISTA', 'COMERCIO', 'RESTAURANT', 'SUPERMERCADO', 'ABASTO', 'PANADERIA', 'FARMACIA');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'RESET', 'BLOCKED', 'PAUSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT,
    "apellido" TEXT,
    "telefono_celular" TEXT,
    "cargo" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "role" "UserRole" NOT NULL DEFAULT 'CLIENTE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "CustomerType" NOT NULL,
    "tipo_doc_identidad" "DocumentType",
    "name" TEXT NOT NULL,
    "doc_number" TEXT NOT NULL,
    "telefono_empresa" TEXT,
    "telefono_celular" TEXT,
    "email" TEXT,
    "direccion_fiscal" TEXT,
    "settings" JSONB,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "documents" JSONB,
    "bank_account_info" JSONB,
    "socios_info" JSONB,
    "persona_contacto_info" JSONB,
    "representante_legal_info" JSONB,
    "fecha_constitucion" TIMESTAMP(3),
    "urbanizacion" TEXT,
    "ciudad" TEXT,
    "estado" TEXT,
    "pais" TEXT,
    "codigo_postal" TEXT,
    "rubro" "Rubro",
    "que_vendes" TEXT,
    "tipo_venta" "SaleType",
    "figura_legal" "LegalFigure",
    "tipo_empresa" "CompanyType",
    "descripcion_ventas" TEXT,
    "sitio_web" TEXT,
    "is_agente_retencion" BOOLEAN NOT NULL DEFAULT false,
    "porcent_retencion_islr" DECIMAL(5,2),
    "porcent_retencion_iva" DECIMAL(5,2),
    "porcent_retencion_municipio" DECIMAL(5,2),
    "fecha_registro" TIMESTAMP(3),
    "ip_registro" TEXT,
    "fecha_eliminacion" TIMESTAMP(3),
    "ip_eliminacion" TEXT,
    "is_acepta_terminos" BOOLEAN NOT NULL DEFAULT false,
    "fecha_acepta_terminos" TIMESTAMP(3),
    "ip_acepta_terminos" TEXT,
    "is_acepta_boletin" BOOLEAN NOT NULL DEFAULT false,
    "fecha_acepta_boletin" TIMESTAMP(3),
    "ip_acepta_boletin" TEXT,
    "is_acepta_declaracion_jurada" BOOLEAN NOT NULL DEFAULT false,
    "fecha_declaracion_jurada" TIMESTAMP(3),
    "ip_declaracion_jurada" TEXT,
    "email_user_masiva_SMS" TEXT,
    "email_user_masiva_whatsapp" TEXT,
    "solo_enviar_cobro_contacto_oobranza" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "billing_cycle" "BillingCycle",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price_list_id" TEXT NOT NULL,
    "price_usd" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "currency_rate" DECIMAL(10,4) NOT NULL,
    "subtotal_usd" DECIMAL(10,2) NOT NULL,
    "tax_amount_usd" DECIMAL(10,2) NOT NULL,
    "total_usd" DECIMAL(10,2) NOT NULL,
    "subtotal_bs" DECIMAL(10,2) NOT NULL,
    "tax_amount_bs" DECIMAL(10,2) NOT NULL,
    "total_bs" DECIMAL(10,2) NOT NULL,
    "retention_amount_bs" DECIMAL(10,2) NOT NULL,
    "proximo_vencimiento_producto" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_usd" DECIMAL(10,2) NOT NULL,
    "total_usd" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modulo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tipouser" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "modulo_id" TEXT NOT NULL,
    "is_massiva" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametro" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parametro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_user_id_key" ON "Customer"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_doc_number_key" ON "Customer"("doc_number");

-- CreateIndex
CREATE UNIQUE INDEX "ProductPrice_product_id_price_list_id_key" ON "ProductPrice"("product_id", "price_list_id");

-- CreateIndex
CREATE UNIQUE INDEX "Modulo_name_key" ON "Modulo"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Parametro_key_key" ON "Parametro"("key");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "PriceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_modulo_id_fkey" FOREIGN KEY ("modulo_id") REFERENCES "Modulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
