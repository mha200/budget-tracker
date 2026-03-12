import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check for the NextAuth session cookie (JWT strategy)
  const token =
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token");

  if (!token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect everything except public routes and static files
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|$).*)",
  ],
};
