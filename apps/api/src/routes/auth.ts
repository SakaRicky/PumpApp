import type { Request, Response, NextFunction } from "express"
import { Router } from "express"
import { login } from "../controllers/authController.js"

const authRouter = Router()

const asyncLogin = (req: Request, res: Response, next: NextFunction): void => {
  void login(req, res).catch(next)
}

authRouter.post("/login", asyncLogin)

export { authRouter }
