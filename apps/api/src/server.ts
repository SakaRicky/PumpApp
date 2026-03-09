import "dotenv/config"
import { app } from "./app.js"
import { prisma } from "./db.js"

const PORT = Number(process.env.PORT) || 4000

const start = async () => {
  try {
    await prisma.$connect()
    console.log("Connected to database")
  } catch (e) {
    console.error(
      "Failed to connect to database:",
      e instanceof Error ? e.message : e
    )
    process.exit(1)
  }
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
  })
}

start()
