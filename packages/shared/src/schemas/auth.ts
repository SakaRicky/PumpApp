import { z } from "zod"

/**
 * Login request body. The API uses "username" for compatibility with API-DESIGN;
 * the backend treats it as the user's email (User model has email, no separate username).
 */
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

export type LoginInput = z.infer<typeof loginSchema>

// Login response shape (no password). Defined in dto; re-exported here for auth module.
export type { LoginResponse, LoginResponseUser } from "../dto/index.js"
