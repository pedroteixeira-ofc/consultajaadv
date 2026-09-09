import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware placeholder — auth real (Supabase / cookies) na próxima fase.
 * Por ora apenas passa adiante; rotas /admin, /adv, /client serão protegidas depois.
 * Anonimato OPCIONAL na requisição (cliente escolhe identificado ou anônimo).
 */
export function middleware(_request: NextRequest) {
  // TODO: validar sessão admin | lawyer | client (anon opcional na request)
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
