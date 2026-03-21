import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import {
  list,
  getById,
  create,
  exportCsv,
} from "../controllers/weeklyInventoryCloseController.js"

const weeklyInventoryClosesRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

weeklyInventoryClosesRouter.use(requireAuth)
weeklyInventoryClosesRouter.use(requireAdmin)

weeklyInventoryClosesRouter.get("/export.csv", asyncHandler(exportCsv))
weeklyInventoryClosesRouter.get("/", asyncHandler(list))
weeklyInventoryClosesRouter.post("/", asyncHandler(create))
weeklyInventoryClosesRouter.get("/:id", asyncHandler(getById))

export { weeklyInventoryClosesRouter }
