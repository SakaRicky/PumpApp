import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import {
  shiftsReport,
  dailyReport,
  tankVarianceReport,
} from "../controllers/reportController.js"

const reportsRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

reportsRouter.use(requireAuth)

reportsRouter.get("/shifts", requireAdmin, asyncHandler(shiftsReport))
reportsRouter.get("/daily", requireAdmin, asyncHandler(dailyReport))
reportsRouter.get(
  "/tank-variance",
  requireAdmin,
  asyncHandler(tankVarianceReport)
)

export { reportsRouter }
