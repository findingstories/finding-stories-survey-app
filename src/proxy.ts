import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const publicPaths = ["/login", "/invite/", "/survey/", "/setup", "/forgot-password", "/reset-password", "/api/auth", "/api/setup", "/api/responses", "/api/invitations/", "/api/password-reset", "/api/submit-survey"];
  // Survey cover images are shown to respondents; uploading still needs a login
  const isPublicCoverImage =
    req.method === "GET" && /^\/api\/questionnaires\/[^/]+\/cover-image$/.test(pathname);
  const isPublic = publicPaths.some((p) => pathname.startsWith(p)) || isPublicCoverImage;

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
