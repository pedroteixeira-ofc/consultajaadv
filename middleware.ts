import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "cja_session";

function secretKey() {
  const secret =
    process.env.SESSION_SECRET ||
    "consultajaadv-local-demo-secret-change-me-in-prod";
  return new TextEncoder().encode(secret);
}

async function readRole(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return (payload.role as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * Auth gate — anonimato opcional só na requisição (cliente logado marca checkbox).
 * Public: /, /sac, register/login/setup pages.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await readRole(request);

  const isAdminPublic =
    pathname === "/admin/login" || pathname === "/admin/setup";
  const isAdvPublic =
    pathname === "/adv/login" || pathname === "/adv/register";
  const isClientPublic =
    pathname === "/client/login" || pathname === "/client/register";

  if (pathname.startsWith("/admin") && !isAdminPublic) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/adv") && !isAdvPublic) {
    if (role !== "lawyer") {
      return NextResponse.redirect(new URL("/adv/login", request.url));
    }
  }

  if (pathname.startsWith("/client") && !isClientPublic) {
    if (role !== "client") {
      return NextResponse.redirect(new URL("/client/login", request.url));
    }
  }

  if (pathname.startsWith("/standby") || pathname.startsWith("/call")) {
    if (!role) {
      return NextResponse.redirect(new URL("/client/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/adv/:path*",
    "/client/:path*",
    "/standby/:path*",
    "/call/:path*",
  ],
};
