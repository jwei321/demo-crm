// Edge-safe JWT helpers. No Node-only imports here so this module can be used
// from middleware (Edge runtime) as well as from server components / route handlers.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "relay_session";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "relay-dev-insecure-secret-change-me",
);

export type SessionPayload = {
  sub: string; // user id
  email: string;
  name: string;
};

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}
