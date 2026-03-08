import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, create, update } from "../controllers/categoryController.js"

const categoriesRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

categoriesRouter.use(requireAuth)
categoriesRouter.get("/", asyncHandler(list))
categoriesRouter.post("/", requireAdmin, asyncHandler(create))
categoriesRouter.patch("/:id", requireAdmin, asyncHandler(update))

export { categoriesRouter }
