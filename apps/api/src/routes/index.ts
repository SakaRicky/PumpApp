import { Router } from "express"
import { healthRouter } from "./health.js"

const apiRouter = Router()

apiRouter.get("/", (_req, res) => {
  res.json({ name: "PumpApp API", version: "0.1.0" })
})
apiRouter.use("/health", healthRouter)

export { apiRouter }
