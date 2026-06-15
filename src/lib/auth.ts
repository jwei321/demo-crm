// Node-runtime auth helpers (password hashing + cookie session).
// Used from route handlers and server components — NOT from middleware.
import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SessionPayload,
  signToken,
  verifyToken,
} from "./jwt";

const ONE_WEEK = 60 * 60 * 24 * 7;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Sign a session and store it in an httpOnly cookie. Route handlers only. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK,
  });
}

export function clearSession(): void {
  cookies().delete(SESSION_COOKIE);
}

/** Read the current session, or null if not signed in. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Server components: returns the session or redirects to /login. */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Route handlers: returns the user id or null (caller returns 401). */
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.sub ?? null;
}
