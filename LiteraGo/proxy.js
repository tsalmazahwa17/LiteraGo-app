import { NextResponse } from "next/server";

const protectedRoutes = [
  "/home",
  "/kategori",
  "/book",
  "/libraries",
  "/wishlist",
  "/cart",
  "/payment",
  "/invoice",
  "/borrow",
  "/notifications",
  "/profile",
  "/help",
  "/admin",
];

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/admin/login",
];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const needsAuth = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!needsAuth) {
    return NextResponse.next();
  }

  const hasAuthCookie = request.cookies.get("literago_auth")?.value === "1";

  if (hasAuthCookie) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();

  if (pathname.startsWith("/admin")) {
    loginUrl.pathname = "/admin/login";
  } else {
    loginUrl.pathname = "/login";
  }

  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/home/:path*",
    "/kategori/:path*",
    "/book/:path*",
    "/libraries/:path*",
    "/wishlist/:path*",
    "/cart/:path*",
    "/payment/:path*",
    "/invoice/:path*",
    "/borrow/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/help/:path*",
    "/admin/:path*",
  ],
};