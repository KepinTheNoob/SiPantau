export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (url === undefined || url === "") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL belum dikonfigurasi. Salin .env.example ke .env.local dan isi nilainya."
    );
  }

  return url;
}

export function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (key === undefined || key === "") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY belum dikonfigurasi. Salin .env.example ke .env.local dan isi nilainya."
    );
  }

  return key;
}
