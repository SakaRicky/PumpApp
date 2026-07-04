import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import {
  listBalances,
  createSettlement,
} from "../controllers/shortageController.js"

const shortagesRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

shortagesRouter.use(requireAuth)

shortagesRouter.get("/", requireAdmin, asyncHandler(listBalances))
shortagesRouter.post("/settlements", requireAdmin, asyncHandler(createSettlement))

export { shortagesRouter }
