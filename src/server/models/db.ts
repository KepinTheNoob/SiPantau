import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types";

/** Client Supabase yang dipakai semua model (sesi pengguna atau service role). */
export type DbClient = SupabaseClient<Database>;

type PublicTables = Database["public"]["Tables"];

export type TableInsert<Table extends keyof PublicTables> =
  PublicTables[Table]["Insert"];

export type TableUpdate<Table extends keyof PublicTables> =
  PublicTables[Table]["Update"];
