import express from "express"
import cors from "cors"
import { apiRouter } from "./routes/index.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { AppError, ErrorCode } from "./types/errors.js"

const app = express()

app.use(cors({ origin: process.env.WEB_ORIGIN ?? true }))
app.use(express.json())

app.use("/api", apiRouter)

app.use("/api", (_req, _res, next) => {
  next(new AppError("Not found", 404, ErrorCode.NOT_FOUND))
})

app.use(errorHandler)

export { app }
