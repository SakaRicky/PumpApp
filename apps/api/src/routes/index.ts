import { Router } from "express"
import { authRouter } from "./auth.js"
import { categoriesRouter } from "./categories.js"
import { healthRouter } from "./health.js"
import { productsRouter } from "./products.js"
import { usersRouter } from "./users.js"
import { workersRouter } from "./workers.js"

const apiRouter = Router()

apiRouter.get("/", (_req, res) => {
  res.json({ name: "PumpApp API", version: "0.1.0" })
})
apiRouter.use("/health", healthRouter)
apiRouter.use("/auth", authRouter)
apiRouter.use("/categories", categoriesRouter)
apiRouter.use("/products", productsRouter)
apiRouter.use("/users", usersRouter)
apiRouter.use("/workers", workersRouter)

export { apiRouter }
