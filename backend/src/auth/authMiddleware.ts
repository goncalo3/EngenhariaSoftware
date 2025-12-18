import type { Request, Response, NextFunction } from "express";
import { verifyJwtPayload } from "./makeJwtPayload.ts";
import type { JwtPayload } from "./makeJwtPayload.ts";

/**
 * Extended Request interface that includes the authenticated user's data
 */
export interface AuthenticatedRequest extends Request {
  userId: string;
}

/**
 * Type guard to check if a request is authenticated
 */
export function isAuthenticatedRequest(
  req: Request
): req is AuthenticatedRequest {
  return "userId" in req && typeof (req as AuthenticatedRequest).userId === "string";
}

/**
 * Authentication middleware that validates JWT tokens
 * Extracts the token from the Authorization header (Bearer token)
 * or from the httpOnly cookie, and appends the userId to the request object
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    let token: string | undefined;

    // First, try to get token from Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const [bearer, headerToken] = authHeader.split(" ");
      if (bearer === "Bearer" && headerToken) {
        token = headerToken;
      }
    }

    // If no token in header, try to get from cookie
    if (!token) {
      token = req.cookies?.token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const payload: JwtPayload = verifyJwtPayload(token);

    // Append userId to the request object
    (req as AuthenticatedRequest).userId = payload.userId;

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({
          success: false,
          message: "Token has expired",
        });
        return;
      }

      if (error.name === "JsonWebTokenError") {
        res.status(401).json({
          success: false,
          message: "Invalid token",
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
}

export default authMiddleware;
