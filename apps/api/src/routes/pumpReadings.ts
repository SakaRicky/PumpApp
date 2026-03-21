import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { updateReading } from "../controllers/pumpReadingController.js"

const pumpReadingsRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

pumpReadingsRouter.use(requireAuth)
pumpReadingsRouter.patch("/:id", requireAdmin, asyncHandler(updateReading))

export { pumpReadingsRouter }
