/**
 * Idempotent baseline seed for local development and Railway deployments.
 *
 * Run after migrations:
 *   pnpm db:seed
 *
 * Production/Railway env overrides:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD
 *   SEED_ADMIN_NAME
 *   SEED_DEMO_SHIFT=true   // optional, creates one planned sample shift
 *
 * Local fallback admin:
 *   admin@pumpapp.local / admin123
 */

import "dotenv/config"
import bcrypt from "bcrypt"
import { PrismaClient } from "../apps/api/node_modules/.prisma/client"

const prisma = new PrismaClient()

const BCRYPT_ROUNDS = 10

const env = (key: string, fallback: string): string => {
  const value = process.env[key]?.trim()
  return value && value.length > 0 ? value : fallback
}

const ADMIN_EMAIL = env("SEED_ADMIN_EMAIL", "admin@pumpapp.local")
const ADMIN_PASSWORD = env("SEED_ADMIN_PASSWORD", "admin123")
const ADMIN_NAME = env("SEED_ADMIN_NAME", "Station Admin")
const SEED_DEMO_SHIFT = process.env.SEED_DEMO_SHIFT === "true"

const findOrCreateWorker = async (name: string, designation: string) => {
  const existing = await prisma.worker.findFirst({ where: { name } })
  if (existing) {
    return prisma.worker.update({
      where: { id: existing.id },
      data: { designation, active: true },
    })
  }

  return prisma.worker.create({
    data: { name, designation, active: true },
  })
}

const seedAdminUser = async () => {
  const worker = await findOrCreateWorker(ADMIN_NAME, "Admin")
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS)
  const existingUser = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  })

  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        workerId: worker.id,
        name: ADMIN_NAME,
        role: "ADMIN",
        active: true,
        passwordHash,
      },
    })
  } else {
    await prisma.user.create({
      data: {
        workerId: worker.id,
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        passwordHash,
        role: "ADMIN",
        userType: "SYSTEM_USER",
        active: true,
      },
    })
  }

  console.log(`Seeded admin user: ${ADMIN_EMAIL}`)
}

const seedWorkers = async () => {
  const workers = [
    { name: "Alice", designation: "Pumpist" },
    { name: "Dylan", designation: "Pumpist" },
    { name: "Jean", designation: "Pumpist" },
    { name: "Bob", designation: "Shop" },
  ]

  const result = []
  for (const worker of workers) {
    result.push(await findOrCreateWorker(worker.name, worker.designation))
  }

  console.log(`Seeded workers: ${workers.length}`)
  return result
}

const findOrCreateCategory = async (name: string, description: string) => {
  const existing = await prisma.category.findFirst({ where: { name } })
  if (existing) {
    return prisma.category.update({
      where: { id: existing.id },
      data: { description },
    })
  }

  return prisma.category.create({ data: { name, description } })
}

const seedCategories = async () => {
  const rows = [
    { name: "Beverages", description: "Drinks and bottled water" },
    { name: "Snacks", description: "Snacks and sweets" },
    { name: "Vehicle supplies", description: "Oil, additives and accessories" },
  ]

  const byName = new Map<string, number>()
  for (const row of rows) {
    const category = await findOrCreateCategory(row.name, row.description)
    byName.set(row.name, category.id)
  }

  console.log(`Seeded categories: ${rows.length}`)
  return byName
}

const seedProducts = async (categoryByName: Map<string, number>) => {
  const categoryId = (name: string): number => {
    const id = categoryByName.get(name)
    if (!id) throw new Error(`Missing seeded category: ${name}`)
    return id
  }

  const products = [
    {
      name: "Water 0.5L",
      categoryId: categoryId("Beverages"),
      sellingPrice: "300.00",
      purchasePrice: "200.00",
      currentStock: "100.000",
    },
    {
      name: "Water 1.5L",
      categoryId: categoryId("Beverages"),
      sellingPrice: "600.00",
      purchasePrice: "400.00",
      currentStock: "60.000",
    },
    {
      name: "Soda can",
      categoryId: categoryId("Beverages"),
      sellingPrice: "500.00",
      purchasePrice: "350.00",
      currentStock: "72.000",
    },
    {
      name: "Biscuits",
      categoryId: categoryId("Snacks"),
      sellingPrice: "250.00",
      purchasePrice: "150.00",
      currentStock: "80.000",
    },
    {
      name: "Peanuts",
      categoryId: categoryId("Snacks"),
      sellingPrice: "300.00",
      purchasePrice: "200.00",
      currentStock: "50.000",
    },
    {
      name: "Engine oil 1L",
      categoryId: categoryId("Vehicle supplies"),
      sellingPrice: "4500.00",
      purchasePrice: "3500.00",
      currentStock: "18.000",
    },
    {
      name: "Fuel additive",
      categoryId: categoryId("Vehicle supplies"),
      sellingPrice: "3000.00",
      purchasePrice: "2200.00",
      currentStock: "24.000",
    },
  ]

  const now = new Date()
  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name, categoryId: product.categoryId },
    })

    const saved = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            sellingPrice: product.sellingPrice,
            currentStock: product.currentStock,
            active: true,
          },
        })
      : await prisma.product.create({
          data: {
            name: product.name,
            categoryId: product.categoryId,
            sellingPrice: product.sellingPrice,
            currentStock: product.currentStock,
            active: true,
          },
        })

    const purchasePrice = await prisma.purchasePriceHistory.findFirst({
      where: {
        productId: saved.id,
        purchasePrice: product.purchasePrice,
      },
    })
    if (!purchasePrice) {
      await prisma.purchasePriceHistory.create({
        data: {
          productId: saved.id,
          purchasePrice: product.purchasePrice,
          effectiveAt: now,
          notes: "Seed baseline purchase price",
        },
      })
    }

    const sellingPrice = await prisma.sellingPriceHistory.findFirst({
      where: {
        productId: saved.id,
        price: product.sellingPrice,
      },
    })
    if (!sellingPrice) {
      await prisma.sellingPriceHistory.create({
        data: {
          productId: saved.id,
          price: product.sellingPrice,
          effectiveAt: now,
        },
      })
    }
  }

  console.log(`Seeded products: ${products.length}`)
}

const findOrCreateFuelType = async (name: string) => {
  const existing = await prisma.fuelType.findFirst({ where: { name } })
  if (existing) {
    return prisma.fuelType.update({
      where: { id: existing.id },
      data: { active: true },
    })
  }

  return prisma.fuelType.create({ data: { name, active: true } })
}

const findOrCreateTank = async (
  name: string,
  fuelTypeId: number,
  capacity: string,
  theoreticalQuantity: string
) => {
  const existing = await prisma.tank.findFirst({ where: { name } })
  const data = {
    fuelTypeId,
    capacity,
    theoreticalQuantity,
    actualQuantity: theoreticalQuantity,
    actualQuantityRecordedAt: new Date(),
    dipToleranceLiters: "100.000",
    dipTolerancePct: "2.00",
    active: true,
  }

  if (existing) {
    return prisma.tank.update({ where: { id: existing.id }, data })
  }

  return prisma.tank.create({ data: { name, ...data } })
}

const findOrCreatePump = async (name: string, tankId: number) => {
  const existing = await prisma.pump.findFirst({ where: { name } })
  if (existing) {
    return prisma.pump.update({
      where: { id: existing.id },
      data: { tankId, active: true },
    })
  }

  return prisma.pump.create({ data: { name, tankId, active: true } })
}

const seedFuelSetup = async () => {
  const superFuel = await findOrCreateFuelType("Super")
  const diesel = await findOrCreateFuelType("Gasoil")

  const superTank = await findOrCreateTank(
    "Super Tank",
    superFuel.id,
    "30000.000",
    "15000.000"
  )
  const dieselTank = await findOrCreateTank(
    "Gasoil Tank",
    diesel.id,
    "30000.000",
    "15000.000"
  )

  await findOrCreatePump("Pump 1", superTank.id)
  await findOrCreatePump("Pump 2", dieselTank.id)
  await findOrCreatePump("Pump 3", superTank.id)

  const now = new Date()
  const prices = [
    { fuelTypeId: superFuel.id, pricePerUnit: "850.00", purchasePrice: "760.00" },
    { fuelTypeId: diesel.id, pricePerUnit: "800.00", purchasePrice: "720.00" },
  ]

  for (const price of prices) {
    const existing = await prisma.fuelPriceHistory.findFirst({
      where: {
        fuelTypeId: price.fuelTypeId,
        effectiveTo: null,
      },
    })

    if (existing) {
      await prisma.fuelPriceHistory.update({
        where: { id: existing.id },
        data: {
          pricePerUnit: price.pricePerUnit,
          purchasePricePerUnit: price.purchasePrice,
        },
      })
    } else {
      await prisma.fuelPriceHistory.create({
        data: {
          fuelTypeId: price.fuelTypeId,
          pricePerUnit: price.pricePerUnit,
          purchasePricePerUnit: price.purchasePrice,
          effectiveFrom: now,
          effectiveTo: null,
        },
      })
    }
  }

  console.log("Seeded fuel setup: 2 fuel types, 2 tanks, 3 pumps")
}

const seedSettings = async () => {
  const settings = [
    { key: "station.timezone", value: "Africa/Douala" },
    { key: "station.name", value: "PumpPro Station" },
    { key: "readings.maxVolumePerShiftLiters", value: 5000 },
  ]

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      create: setting,
      update: { value: setting.value },
    })
  }

  console.log(`Seeded settings: ${settings.length}`)
}

const seedDemoShift = async (workers: Awaited<ReturnType<typeof seedWorkers>>) => {
  const date = new Date("2026-01-05T00:00:00.000Z")
  const startTime = new Date("2026-01-05T08:00:00.000Z")
  const endTime = new Date("2026-01-05T18:00:00.000Z")
  const shift = await prisma.shift.findFirst({
    where: {
      startTime,
      endTime,
    },
  })

  const shopWorker = workers.find((worker) =>
    worker.designation?.toLowerCase().includes("shop")
  )
  const savedShift =
    shift ??
    (await prisma.shift.create({
      data: {
        date,
        startTime,
        endTime,
        status: "PLANNED",
        notes: "Optional seed demo shift",
        shopAccountableWorkerId: shopWorker?.id,
      },
    }))

  for (const worker of workers) {
    await prisma.shiftWorker.upsert({
      where: {
        shiftId_workerId: {
          shiftId: savedShift.id,
          workerId: worker.id,
        },
      },
      create: {
        shiftId: savedShift.id,
        workerId: worker.id,
      },
      update: {},
    })
  }

  console.log(`Seeded optional demo shift: ${savedShift.id}`)
}

const main = async () => {
  await seedAdminUser()
  const workers = await seedWorkers()
  const categories = await seedCategories()
  await seedProducts(categories)
  await seedFuelSetup()
  await seedSettings()

  if (SEED_DEMO_SHIFT) {
    await seedDemoShift(workers)
  }
}

const run = async () => {
  try {
    await main()
    console.log("Seed completed.")
  } catch (error) {
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

void run()
