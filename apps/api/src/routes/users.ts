import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, create, update } from "../controllers/userController.js"

const usersRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

usersRouter.use(requireAuth, requireAdmin)
usersRouter.get("/", asyncHandler(list))
usersRouter.post("/", asyncHandler(create))
usersRouter.patch("/:id", asyncHandler(update))

export { usersRouter }
