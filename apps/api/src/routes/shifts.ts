import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { requireAuth, requireAdmin } from "../middleware/auth.js"
import {
  list,
  create,
  update,
  listWorkers,
  assignWorkers,
  unassignWorker,
  listStock,
  upsertStock,
  listPumpAssignments,
  assignPump,
} from "../controllers/shiftController.js"
import {
  listByShift as listPumpReadings,
  createForShift as createPumpReadingForShift,
} from "../controllers/pumpReadingController.js"

const shiftsRouter = Router()

const asyncHandler = (fn: (req: Request, res: Response) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    void fn(req, res).catch(next)
  }
}

shiftsRouter.use(requireAuth)

shiftsRouter.get("/", asyncHandler(list))
shiftsRouter.post("/", requireAdmin, asyncHandler(create))
shiftsRouter.patch("/:id", requireAdmin, asyncHandler(update))

shiftsRouter.get("/:id/workers", requireAdmin, asyncHandler(listWorkers))
shiftsRouter.post("/:id/workers", requireAdmin, asyncHandler(assignWorkers))
shiftsRouter.delete(
  "/:id/workers/:workerId",
  requireAdmin,
  asyncHandler(unassignWorker)
)

shiftsRouter.get("/:id/stock", requireAdmin, asyncHandler(listStock))
shiftsRouter.put("/:id/stock", requireAdmin, asyncHandler(upsertStock))

shiftsRouter.get(
  "/:id/pump-assignments",
  requireAdmin,
  asyncHandler(listPumpAssignments)
)
shiftsRouter.post(
  "/:id/pump-assignments",
  requireAdmin,
  asyncHandler(assignPump)
)

shiftsRouter.get(
  "/:id/pump-readings",
  requireAdmin,
  asyncHandler(listPumpReadings)
)
shiftsRouter.post(
  "/:id/pump-readings",
  requireAdmin,
  asyncHandler(createPumpReadingForShift)
)

export { shiftsRouter }

