import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/invite/", "/q/", "/setup", "/api/auth", "/api/setup", "/api/responses", "/api/invitations/"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (req.auth && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
