import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { getDashboard } from "../controllers/dashboardController.js"

const dashboardRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

dashboardRouter.use(requireAuth)

dashboardRouter.get("/", asyncHandler(getDashboard))

export { dashboardRouter }
