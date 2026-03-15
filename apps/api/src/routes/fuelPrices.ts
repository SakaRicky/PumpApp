import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import {
  list,
  create,
  update,
} from "../controllers/fuelPriceHistoryController.js"

const fuelPricesRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

fuelPricesRouter.use(requireAuth)

fuelPricesRouter.get("/", asyncHandler(list))
fuelPricesRouter.post("/", requireAdmin, asyncHandler(create))
fuelPricesRouter.patch("/:id", requireAdmin, asyncHandler(update))

export { fuelPricesRouter }
