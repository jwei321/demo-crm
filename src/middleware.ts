import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/jwt";

const PUBLIC_PAGES = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auth endpoints must always be reachable.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyToken(token) : null;
  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  // Unauthenticated API calls get a clean 401 instead of an HTML redirect.
  if (!session && pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session && !isPublicPage) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  if (session && isPublicPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and static files (paths with a dot).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
