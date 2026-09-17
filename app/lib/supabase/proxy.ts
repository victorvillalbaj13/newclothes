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

          cookiesToSet.forEach(
            ({ name, value, options }) => {
              response.cookies.set(
                name,
                value,
                options
              );
            }
          );
        },
      },
    }
  );

  const { data } =
    await supabase.auth.getClaims();

  const claims = data?.claims;

  const pathname =
    request.nextUrl.pathname;

  if (pathname === "/admin/login") {
    if (claims) {
      const adminUserId =
        process.env.ADMIN_USER_ID;

      if (claims.sub === adminUserId) {
        return NextResponse.redirect(
          new URL(
            "/admin/dashboard",
            request.url
          )
        );
      }

      return NextResponse.redirect(
        new URL(
          "/admin/login?error=unauthorized",
          request.url
        )
      );
    }

    return response;
  }

  if (pathname.startsWith("/admin")) {
    if (!claims) {
      return NextResponse.redirect(
        new URL(
          "/admin/login",
          request.url
        )
      );
    }

    const adminUserId =
      process.env.ADMIN_USER_ID;

    if (claims.sub !== adminUserId) {
      return NextResponse.redirect(
        new URL(
          "/admin/login?error=unauthorized",
          request.url
        )
      );
    }
  }

  return response;
}