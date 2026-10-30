import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";
import { getSupabaseUrl } from "@/lib/supabase/env";

export function getAdminServiceClient(): SupabaseClient<Database> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (serviceRoleKey === undefined || serviceRoleKey === "") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi. Salin .env.example ke .env.local dan isi nilainya."
    );
  }

  return createClient<Database>(getSupabaseUrl(), serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
