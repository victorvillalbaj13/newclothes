import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(
              name,
              value,
              options
            );
          });

          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();

  const claims = data?.claims;
  const pathname = request.nextUrl.pathname;

  const adminUserId = process.env.ADMIN_USER_ID;

  /*
   * LOGIN
   */
  if (pathname === "/admin/login") {
    // No hay sesión: mostrar el login normalmente.
    if (!claims) {
      return supabaseResponse;
    }

    // Usuario autenticado y autorizado: ir al dashboard.
    if (adminUserId && claims.sub === adminUserId) {
      return NextResponse.redirect(
        new URL("/admin/dashboard", request.url)
      );
    }

    // Usuario autenticado pero no autorizado:
    // permanecer en el login sin redirigir nuevamente al mismo login.
    return supabaseResponse;
  }

  /*
   * PROTECCIÓN DEL PANEL ADMIN
   */
  if (pathname.startsWith("/admin")) {
    // No hay sesión → login.
    if (!claims) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    // Hay sesión pero no corresponde al administrador.
    if (!adminUserId || claims.sub !== adminUserId) {
      return NextResponse.redirect(
        new URL("/admin/login?error=unauthorized", request.url)
      );
    }
  }

  return supabaseResponse;
}