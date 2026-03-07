/**
 * Idempotent seed script for dev baseline data.
 * Run with: pnpm db:seed
 *
 * Dev admin: admin@pumpapp.local / admin123
 */

import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"

const prisma = new PrismaClient()

const BCRYPT_ROUNDS = 10
const ADMIN_EMAIL = "admin@pumpapp.local"
const ADMIN_PASSWORD = "admin123"

const seedUser = async () => {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS)
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      name: "Dev Admin",
      email: ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN",
      userType: "SYSTEM_USER",
    },
    update: { name: "Dev Admin", role: "ADMIN" },
  })
  console.log("Seeded user:", ADMIN_EMAIL)
}

const seedCategories = async (): Promise<number[]> => {
  const names = [
    { name: "Beverages", description: "Drinks" },
    { name: "Snacks", description: "Snacks and sweets" },
    { name: "Fuel additives", description: "Fuel additives" },
  ]
  const ids: number[] = []
  for (const { name, description } of names) {
    let cat = await prisma.category.findFirst({ where: { name } })
    if (!cat) {
      cat = await prisma.category.create({ data: { name, description } })
    }
    ids.push(cat.id)
  }
  console.log("Seeded categories:", names.length)
  return ids
}

const seedProducts = async (categoryIds: number[]) => {
  const [bevId, snacksId, additivesId] = categoryIds
  const products = [
    {
      name: "Water 0.5L",
      categoryId: bevId,
      sellingPrice: "1.50",
      currentStock: "100",
    },
    {
      name: "Cola 0.33L",
      categoryId: bevId,
      sellingPrice: "2.00",
      currentStock: "80",
    },
    {
      name: "Chips",
      categoryId: snacksId,
      sellingPrice: "2.50",
      currentStock: "50",
    },
    {
      name: "Chocolate bar",
      categoryId: snacksId,
      sellingPrice: "1.80",
      currentStock: "60",
    },
    {
      name: "Fuel additive",
      categoryId: additivesId,
      sellingPrice: "8.00",
      currentStock: "20",
    },
  ]
  for (const p of products) {
    const existing = await prisma.product.findFirst({
      where: { name: p.name, categoryId: p.categoryId },
    })
    if (!existing) {
      await prisma.product.create({ data: p })
    }
  }
  console.log("Seeded products:", products.length)
}

const seedPumps = async () => {
  const names = ["Pump 1", "Pump 2"]
  for (const name of names) {
    const existing = await prisma.pump.findFirst({ where: { name } })
    if (!existing) {
      await prisma.pump.create({ data: { name } })
    }
  }
  console.log("Seeded pumps:", names.length)
}

const seedWorkers = async (): Promise<number[]> => {
  const list = [
    { name: "Alice", designation: "Pumpist" },
    { name: "Bob", designation: "Shop" },
  ]
  const ids: number[] = []
  for (const { name, designation } of list) {
    let w = await prisma.worker.findFirst({ where: { name } })
    if (!w) {
      w = await prisma.worker.create({ data: { name, designation } })
    }
    ids.push(w.id)
  }
  console.log("Seeded workers:", list.length)
  return ids
}

const seedShiftAndWorkers = async (workerIds: number[]) => {
  const seedDate = new Date(2025, 0, 15) // 2025-01-15
  const startOfDay = new Date(seedDate)
  const endOfDay = new Date(2025, 0, 16)
  let shift = await prisma.shift.findFirst({
    where: { date: { gte: startOfDay, lt: endOfDay } },
  })
  if (!shift) {
    shift = await prisma.shift.create({
      data: {
        date: new Date(2025, 0, 15),
        startTime: new Date(2025, 0, 15, 7, 0),
        endTime: new Date(2025, 0, 15, 15, 0),
        status: "PLANNED",
        notes: "Seed shift for UI",
      },
    })
  }
  console.log("Seeded shift:", shift.id)

  const existingPairs = await prisma.shiftWorker.findMany({
    where: { shiftId: shift.id },
    select: { workerId: true },
  })
  const existingWorkerIds = new Set(
    existingPairs.map((p: { workerId: number }) => p.workerId)
  )
  for (const workerId of workerIds) {
    if (!existingWorkerIds.has(workerId)) {
      await prisma.shiftWorker.create({
        data: { shiftId: shift.id, workerId },
      })
    }
  }
  console.log("Seeded ShiftWorker assignments")
}

const main = async () => {
  await seedUser()
  const categoryIds = await seedCategories()
  await seedProducts(categoryIds)
  await seedPumps()
  const workerIds = await seedWorkers()
  await seedShiftAndWorkers(workerIds)
}

const run = async () => {
  try {
    await main()
    console.log("Seed completed.")
  } catch (e) {
    console.error(e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

run()
