import type { Request, Response } from "express"
import type { Prisma } from "../../node_modules/.prisma/client/index.js"
import { settingPutSchema, type SettingResponse } from "@pumpapp/shared"
import { prisma } from "../db.js"
import { AppError, ErrorCode } from "../types/errors.js"
import { recordEvent } from "../services/events.js"

type SettingRow = Awaited<ReturnType<typeof prisma.setting.findMany>>[number]

const toResponse = (row: SettingRow): SettingResponse => ({
  key: row.key,
  value: row.value,
  updatedAt: row.updatedAt.toISOString(),
})

const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{0,99}$/

const list = async (_req: Request, res: Response): Promise<void> => {
  const rows = await prisma.setting.findMany({ orderBy: { key: "asc" } })
  res.status(200).json(rows.map(toResponse))
}

const put = async (req: Request, res: Response): Promise<void> => {
  const key = req.params.key
  if (!KEY_PATTERN.test(key)) {
    throw new AppError("Invalid setting key", 400, ErrorCode.VALIDATION_ERROR)
  }

  const parsed = settingPutSchema.safeParse(req.body)
  if (!parsed.success || parsed.data.value === undefined) {
    throw new AppError(
      "Body must include a value",
      400,
      ErrorCode.VALIDATION_ERROR
    )
  }

  const value = parsed.data.value as Prisma.InputJsonValue

  const row = await prisma.$transaction(async (tx) => {
    const saved = await tx.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    })
    await recordEvent(
      {
        type: "SETTING_UPDATED",
        actorUserId: req.user?.id ?? null,
        entity: "setting",
        payload: { key, value },
      },
      tx
    )
    return saved
  })

  res.status(200).json(toResponse(row))
}

export { list, put }
