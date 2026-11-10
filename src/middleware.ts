import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // /proyek dan /laporan-saya ikut dilewatkan supaya sesi login warga tetap diperbarui.
  matcher: [
    "/admin/:path*",
    "/super-admin/:path*",
    "/masuk",
    "/proyek/:path*",
    "/laporan-saya",
  ],
};
