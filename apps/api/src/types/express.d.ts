import type { Role } from "@pumpapp/shared"

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        role: Role
      }
    }
  }
}

export {}
