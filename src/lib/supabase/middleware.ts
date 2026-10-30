import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/db/types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = NextResponse.next({
            request,
          });

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect /admin and /super-admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/super-admin")) {
    if (user === null) {
      const url = request.nextUrl.clone();
      url.pathname = "/masuk";
      url.searchParams.set("redirect", pathname);

      return NextResponse.redirect(url);
    }

    // Check MFA TOTP assurance level
    const { data: aalData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      aalData !== null &&
      aalData.nextLevel === "aal2" &&
      aalData.currentLevel !== "aal2"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/masuk";
      url.searchParams.set("mfa", "1");
      url.searchParams.set("redirect", pathname);

      return NextResponse.redirect(url);
    }
  }

  // If already logged in and visiting /masuk
  if (
    pathname === "/masuk" &&
    user !== null &&
    !request.nextUrl.searchParams.has("mfa")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
