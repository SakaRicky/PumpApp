-- Add purchase price per unit for fuel price history
ALTER TABLE "fuel_price_history"
ADD COLUMN "purchasePricePerUnit" DECIMAL(10,2);

