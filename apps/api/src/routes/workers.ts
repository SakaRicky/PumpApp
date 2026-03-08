import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, create, update } from "../controllers/workerController.js"

const workersRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

workersRouter.use(requireAuth, requireAdmin)
workersRouter.get("/", asyncHandler(list))
workersRouter.post("/", asyncHandler(create))
workersRouter.patch("/:id", asyncHandler(update))

export { workersRouter }
