import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, create, update } from "../controllers/pumpController.js"

const pumpsRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

pumpsRouter.use(requireAuth)

pumpsRouter.get("/", asyncHandler(list))
pumpsRouter.post("/", requireAdmin, asyncHandler(create))
pumpsRouter.patch("/:id", requireAdmin, asyncHandler(update))

export { pumpsRouter }

