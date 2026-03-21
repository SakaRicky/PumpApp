import { Router } from "express"
import { authRouter } from "./auth.js"
import { categoriesRouter } from "./categories.js"
import { healthRouter } from "./health.js"
import { productsRouter } from "./products.js"
import { usersRouter } from "./users.js"
import { workersRouter } from "./workers.js"
import { shiftsRouter } from "./shifts.js"
import { pumpsRouter } from "./pumps.js"
import { fuelPricesRouter } from "./fuelPrices.js"
import { fuelTypesRouter } from "./fuelTypes.js"
import { tanksRouter } from "./tanks.js"
import { fuelDeliveriesRouter } from "./fuelDeliveries.js"
import { pumpReadingsRouter } from "./pumpReadings.js"
import { weeklyInventoryClosesRouter } from "./weeklyInventoryCloses.js"

const apiRouter = Router()

apiRouter.get("/", (_req, res) => {
  res.json({ name: "PumpApp API", version: "0.1.0" })
})
apiRouter.use("/health", healthRouter)
apiRouter.use("/auth", authRouter)
apiRouter.use("/categories", categoriesRouter)
apiRouter.use("/products", productsRouter)
apiRouter.use("/fuel-types", fuelTypesRouter)
apiRouter.use("/tanks", tanksRouter)
apiRouter.use("/fuel-deliveries", fuelDeliveriesRouter)
apiRouter.use("/users", usersRouter)
apiRouter.use("/workers", workersRouter)
apiRouter.use("/shifts", shiftsRouter)
apiRouter.use("/pumps", pumpsRouter)
apiRouter.use("/fuel-prices", fuelPricesRouter)
apiRouter.use("/pump-readings", pumpReadingsRouter)
apiRouter.use("/weekly-inventory-closes", weeklyInventoryClosesRouter)

export { apiRouter }
