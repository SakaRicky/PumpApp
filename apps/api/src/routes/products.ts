import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, create, update } from "../controllers/productController.js"

const productsRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

productsRouter.use(requireAuth)
productsRouter.get("/", asyncHandler(list))
productsRouter.post("/", requireAdmin, asyncHandler(create))
productsRouter.patch("/:id", requireAdmin, asyncHandler(update))

export { productsRouter }
