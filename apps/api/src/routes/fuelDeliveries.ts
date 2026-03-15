import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth } from "../middleware/auth.js"
import { list } from "../controllers/fuelDeliveryController.js"

const fuelDeliveriesRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

fuelDeliveriesRouter.use(requireAuth)
fuelDeliveriesRouter.get("/", asyncHandler(list))

export { fuelDeliveriesRouter }
