import { prisma } from "../db.js"

export const DAY_MS = 24 * 60 * 60 * 1000

export const startOfLocalDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const getTodayActiveShift = async (now = new Date()) => {
  const dayStart = startOfLocalDay(now)
  const dayEnd = new Date(dayStart.getTime() + DAY_MS)

  return prisma.shift.findFirst({
    where: {
      date: { gte: dayStart, lt: dayEnd },
      status: { in: ["PLANNED", "OPEN"] },
    },
    orderBy: [{ status: "desc" }, { startTime: "asc" }],
  })
}
