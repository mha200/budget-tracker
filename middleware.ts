export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    // Protect everything except public routes and static files
    "/((?!api/auth|auth|_next/static|_next/image|favicon.ico|$).*)",
  ],
};
