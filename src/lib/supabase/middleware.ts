import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/db/types";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import { panelHomeForRole } from "@/lib/panel-routes";

/**
 * Kode error Supabase yang berarti sesi di cookie sudah tidak ada di server
 * (misalnya setelah `supabase db reset`, akun dihapus, atau token sudah dipakai).
 */
const STALE_SESSION_ERROR_CODES: ReadonlySet<string> = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "session_not_found",
  "user_not_found",
]);

function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

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
    error: userError,
  } = await supabase.auth.getUser();

  // Sesi basi: hapus cookie auth supaya request berikutnya tidak terus mencoba refresh
  // (sumber error "Invalid Refresh Token: Refresh Token Not Found").
  const staleCookieNames =
    userError?.code !== undefined &&
    STALE_SESSION_ERROR_CODES.has(userError.code)
      ? request.cookies
          .getAll()
          .map((cookie) => cookie.name)
          .filter(isSupabaseAuthCookie)
      : [];

  if (staleCookieNames.length > 0) {
    for (const name of staleCookieNames) {
      request.cookies.delete(name);
    }

    supabaseResponse = NextResponse.next({ request });
  }

  const withStaleCookiesCleared = (response: NextResponse): NextResponse => {
    for (const name of staleCookieNames) {
      response.cookies.delete(name);
    }

    return response;
  };

  const pathname = request.nextUrl.pathname;

  // Protect /admin and /super-admin routes
  if (pathname.startsWith("/admin") || pathname.startsWith("/super-admin")) {
    if (user === null) {
      const url = request.nextUrl.clone();
      url.pathname = "/masuk";
      url.searchParams.set("redirect", pathname);

      return withStaleCookiesCleared(NextResponse.redirect(url));
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

  // Pengelola yang sudah login dan membuka /masuk diarahkan ke panelnya.
  // Akun warga (tanpa profil) tetap boleh melihat halaman /masuk.
  if (
    pathname === "/masuk" &&
    user !== null &&
    !request.nextUrl.searchParams.has("mfa")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile !== null) {
      const url = request.nextUrl.clone();
      url.pathname = panelHomeForRole(profile.role);
      url.search = "";

      return NextResponse.redirect(url);
    }
  }

  return withStaleCookiesCleared(supabaseResponse);
}
