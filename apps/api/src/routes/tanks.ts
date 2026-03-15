import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, create, update } from "../controllers/tankController.js"
import { create as createDelivery } from "../controllers/fuelDeliveryController.js"

const tanksRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

tanksRouter.use(requireAuth)

tanksRouter.get("/", asyncHandler(list))
tanksRouter.post("/", requireAdmin, asyncHandler(create))
tanksRouter.patch("/:id", requireAdmin, asyncHandler(update))
tanksRouter.post(
  "/:tankId/deliveries",
  requireAdmin,
  asyncHandler(createDelivery)
)

export { tanksRouter }
