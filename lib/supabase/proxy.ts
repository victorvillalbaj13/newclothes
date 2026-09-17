import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const pathname = request.nextUrl.pathname;

  // El login permanece público.
  if (pathname === "/admin/login") {
    // Si ya está autenticado, lo enviamos al dashboard.
    if (claims) {
      const adminUserId = process.env.ADMIN_USER_ID;

      if (claims.sub === adminUserId) {
        return NextResponse.redirect(
          new URL("/admin/dashboard", request.url)
        );
      }

      // Usuario autenticado pero que no es el administrador.
      return NextResponse.redirect(
        new URL("/admin/login?error=unauthorized", request.url)
      );
    }

    return response;
  }

  // Todo /admin/* excepto /admin/login requiere autenticación.
  if (pathname.startsWith("/admin")) {
    // No hay sesión.
    if (!claims) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    // Hay sesión, pero no pertenece al único administrador autorizado.
    const adminUserId = process.env.ADMIN_USER_ID;

    if (claims.sub !== adminUserId) {
      return NextResponse.redirect(
        new URL("/admin/login?error=unauthorized", request.url)
      );
    }
  }

  return response;
}