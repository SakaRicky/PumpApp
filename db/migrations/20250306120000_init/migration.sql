-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('SYSTEM_USER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER', 'SALE', 'PUMPIST');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PLANNED', 'OPEN', 'CLOSED', 'RECONCILED');

-- CreateEnum
CREATE TYPE "ShopSalesSource" AS ENUM ('SHIFT_SUMMARY_ENTRY', 'TRANSACTIONAL_SYSTEM_TOTAL', 'MANUAL');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "userType" "UserType" NOT NULL DEFAULT 'SYSTEM_USER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "currentStock" DECIMAL(12,3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_price_history" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(10,2) NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "purchase_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pumps" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pumps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_price_history" (
    "id" SERIAL NOT NULL,
    "pumpId" INTEGER NOT NULL,
    "pricePerUnit" DECIMAL(10,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),

    CONSTRAINT "fuel_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "ShiftStatus" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_workers" (
    "shiftId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,

    CONSTRAINT "shift_workers_pkey" PRIMARY KEY ("shiftId","workerId")
);

-- CreateTable
CREATE TABLE "pump_readings" (
    "id" SERIAL NOT NULL,
    "pumpId" INTEGER NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "openingReading" DECIMAL(12,3) NOT NULL,
    "closingReading" DECIMAL(12,3) NOT NULL,
    "recordedById" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pump_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_hand_ins" (
    "id" SERIAL NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "workerId" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "recordedById" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_hand_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_reconciliation_summaries" (
    "id" SERIAL NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "shopSalesSource" "ShopSalesSource" NOT NULL,
    "systemShopSalesTotal" DECIMAL(10,2),
    "manualShopSalesTotal" DECIMAL(10,2),
    "effectiveShopSalesTotal" DECIMAL(10,2) NOT NULL,
    "manualShopSalesReason" TEXT,
    "fuelSalesTotal" DECIMAL(10,2) NOT NULL,
    "cashHandedTotal" DECIMAL(10,2) NOT NULL,
    "discrepancyAmount" DECIMAL(10,2) NOT NULL,
    "reviewedById" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_reconciliation_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_sales" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "createdById" INTEGER,
    "shiftId" INTEGER,

    CONSTRAINT "shop_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_sale_items" (
    "id" SERIAL NOT NULL,
    "shopSaleId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPriceAtSale" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "shop_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_costs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "monthlyAmount" DECIMAL(10,2) NOT NULL,
    "effectiveMonth" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "fixed_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "purchase_price_history_productId_effectiveAt_idx" ON "purchase_price_history"("productId", "effectiveAt");

-- CreateIndex
CREATE INDEX "fuel_price_history_pumpId_effectiveFrom_effectiveTo_idx" ON "fuel_price_history"("pumpId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "shifts_date_idx" ON "shifts"("date");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE INDEX "shift_workers_shiftId_idx" ON "shift_workers"("shiftId");

-- CreateIndex
CREATE INDEX "shift_workers_workerId_idx" ON "shift_workers"("workerId");

-- CreateIndex
CREATE INDEX "pump_readings_shiftId_pumpId_idx" ON "pump_readings"("shiftId", "pumpId");

-- CreateIndex
CREATE INDEX "cash_hand_ins_shiftId_workerId_idx" ON "cash_hand_ins"("shiftId", "workerId");

-- CreateIndex
CREATE UNIQUE INDEX "shift_reconciliation_summaries_shiftId_key" ON "shift_reconciliation_summaries"("shiftId");

-- CreateIndex
CREATE INDEX "shift_reconciliation_summaries_shiftId_idx" ON "shift_reconciliation_summaries"("shiftId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_price_history" ADD CONSTRAINT "purchase_price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_price_history" ADD CONSTRAINT "fuel_price_history_pumpId_fkey" FOREIGN KEY ("pumpId") REFERENCES "pumps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_workers" ADD CONSTRAINT "shift_workers_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_workers" ADD CONSTRAINT "shift_workers_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pump_readings" ADD CONSTRAINT "pump_readings_pumpId_fkey" FOREIGN KEY ("pumpId") REFERENCES "pumps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pump_readings" ADD CONSTRAINT "pump_readings_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pump_readings" ADD CONSTRAINT "pump_readings_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_hand_ins" ADD CONSTRAINT "cash_hand_ins_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_hand_ins" ADD CONSTRAINT "cash_hand_ins_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_hand_ins" ADD CONSTRAINT "cash_hand_ins_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reconciliation_summaries" ADD CONSTRAINT "shift_reconciliation_summaries_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reconciliation_summaries" ADD CONSTRAINT "shift_reconciliation_summaries_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_sales" ADD CONSTRAINT "shop_sales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_sales" ADD CONSTRAINT "shop_sales_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_sale_items" ADD CONSTRAINT "shop_sale_items_shopSaleId_fkey" FOREIGN KEY ("shopSaleId") REFERENCES "shop_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_sale_items" ADD CONSTRAINT "shop_sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
