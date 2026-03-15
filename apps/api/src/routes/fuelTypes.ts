import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, create, update } from "../controllers/fuelTypeController.js"

const fuelTypesRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

fuelTypesRouter.use(requireAuth)

fuelTypesRouter.get("/", asyncHandler(list))
fuelTypesRouter.post("/", requireAdmin, asyncHandler(create))
fuelTypesRouter.patch("/:id", requireAdmin, asyncHandler(update))

export { fuelTypesRouter }
