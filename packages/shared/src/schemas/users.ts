import { z } from "zod"
import { Role } from "../enums.js"

const roleValues = [Role.ADMIN, Role.USER, Role.SALE, Role.PUMPIST] as const

export const userCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
  role: z.enum(roleValues),
})

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(roleValues).optional(),
  active: z.boolean().optional(),
})

export const workerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  designation: z.string().optional().nullable(),
})

export const workerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  designation: z.string().optional().nullable(),
  active: z.boolean().optional(),
})

export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
export type WorkerCreateInput = z.infer<typeof workerCreateSchema>
export type WorkerUpdateInput = z.infer<typeof workerUpdateSchema>
