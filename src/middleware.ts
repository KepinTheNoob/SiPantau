import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Halaman publik ikut dilewatkan supaya sesi login (ditampilkan di navbar) tetap diperbarui.
  matcher: [
    "/",
    "/admin/:path*",
    "/super-admin/:path*",
    "/admin-login",
    "/proyek/:path*",
    "/instansi/:path*",
    "/pantau-sekitar",
    "/laporan-saya",
  ],
};
