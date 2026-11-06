import { getSupabaseUrl } from "@/lib/supabase/env";

/** URL publik berkas di bucket `evidence`. */
export function evidencePublicUrl(path: string): string {
  return `${getSupabaseUrl()}/storage/v1/object/public/evidence/${path}`;
}
