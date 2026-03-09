import path from "node:path"
import { fileURLToPath } from "node:url"
import express from "express"
import cors from "cors"
import { apiRouter } from "./routes/index.js"
import { errorHandler } from "./middleware/errorHandler.js"
import { AppError, ErrorCode } from "./types/errors.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === "production"

const app = express()

app.use(cors({ origin: process.env.WEB_ORIGIN ?? true }))
app.use(express.json())

app.use("/api", apiRouter)

app.use("/api", (_req, _res, next) => {
  next(new AppError("Not found", 404, ErrorCode.NOT_FOUND))
})

if (isProduction) {
  const publicDir = path.join(__dirname, "..", "public")
  app.use(express.static(publicDir))
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"))
  })
}

app.use(errorHandler)

export { app }
