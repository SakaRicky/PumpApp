-- CreateTable
CREATE TABLE "shift_product_stocks" (
    "shiftId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "openingQty" DECIMAL(12,3) NOT NULL,
    "closingQty" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "shift_product_stocks_pkey" PRIMARY KEY ("shiftId","productId")
);

-- CreateIndex
CREATE INDEX "shift_product_stocks_shiftId_productId_idx" ON "shift_product_stocks"("shiftId", "productId");

-- AddForeignKey
ALTER TABLE "shift_product_stocks" ADD CONSTRAINT "shift_product_stocks_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_product_stocks" ADD CONSTRAINT "shift_product_stocks_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
