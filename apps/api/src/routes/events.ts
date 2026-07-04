import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list } from "../controllers/eventController.js"

const eventsRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

eventsRouter.use(requireAuth)

eventsRouter.get("/", requireAdmin, asyncHandler(list))

export { eventsRouter }
