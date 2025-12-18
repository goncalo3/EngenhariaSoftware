import jwt from "jsonwebtoken";
import type { StringValue } from "ms";

export interface JwtPayload {
  userId: string;
}

export interface JwtTokenResult {
  token: string;
  expiresIn: StringValue;
}

const JWT_SECRET: string = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN: StringValue = (process.env.JWT_EXPIRES_IN as StringValue) || "1h";

/**
 * Creates a JWT token with the userId in the payload
 * @param userId - The user's unique identifier
 * @returns An object containing the token and its expiration time
 */
export function makeJwtPayload(userId: string): JwtTokenResult {
  const payload: JwtPayload = {
    userId,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return {
    token,
    expiresIn: JWT_EXPIRES_IN,
  };
}

/**
 * Verifies a JWT token and returns the payload
 * @param token - The JWT token to verify
 * @returns The decoded payload if valid
 * @throws Error if the token is invalid or expired
 */
export function verifyJwtPayload(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
  return decoded;
}

export default makeJwtPayload;
