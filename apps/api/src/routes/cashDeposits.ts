import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import {
  list,
  create,
  update,
  remove,
} from "../controllers/cashDepositController.js"

const cashDepositsRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

cashDepositsRouter.use(requireAuth)

cashDepositsRouter.get("/", requireAdmin, asyncHandler(list))
cashDepositsRouter.post("/", requireAdmin, asyncHandler(create))
cashDepositsRouter.patch("/:id", requireAdmin, asyncHandler(update))
cashDepositsRouter.delete("/:id", requireAdmin, asyncHandler(remove))

export { cashDepositsRouter }
