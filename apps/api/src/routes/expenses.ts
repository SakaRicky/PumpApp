import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, create, update, remove } from "../controllers/expenseController.js"

const expensesRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

expensesRouter.use(requireAuth)

expensesRouter.get("/", requireAdmin, asyncHandler(list))
expensesRouter.post("/", requireAdmin, asyncHandler(create))
expensesRouter.patch("/:id", requireAdmin, asyncHandler(update))
expensesRouter.delete("/:id", requireAdmin, asyncHandler(remove))

export { expensesRouter }
