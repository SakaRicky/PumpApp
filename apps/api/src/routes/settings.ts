import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import { list, put } from "../controllers/settingController.js"

const settingsRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

settingsRouter.use(requireAuth)

settingsRouter.get("/", requireAdmin, asyncHandler(list))
settingsRouter.put("/:key", requireAdmin, asyncHandler(put))

export { settingsRouter }
