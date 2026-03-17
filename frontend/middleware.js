import { NextResponse } from "next/server";

// Biarkan middleware hanya handle redirect dari root
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Redirect root ke login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};