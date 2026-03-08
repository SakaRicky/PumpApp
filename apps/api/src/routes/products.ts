import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, create, update } from "../controllers/productController.js"
import {
  list as listPurchasePrices,
  create as createPurchasePrice,
} from "../controllers/purchasePriceController.js"

const productsRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

productsRouter.use(requireAuth)
productsRouter.get("/", asyncHandler(list))
productsRouter.post("/", requireAdmin, asyncHandler(create))
// :productId/purchase-prices before :id so Express matches the longer path first
productsRouter.get(
  "/:productId/purchase-prices",
  asyncHandler(listPurchasePrices)
)
productsRouter.post(
  "/:productId/purchase-prices",
  requireAdmin,
  asyncHandler(createPurchasePrice)
)
productsRouter.patch("/:id", requireAdmin, asyncHandler(update))

export { productsRouter }
