-- Migration: citizen_profiles table to store citizen NIK and sync with auth.users

CREATE TABLE IF NOT EXISTS public.citizen_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nik varchar(16) NOT NULL UNIQUE CHECK (nik ~ '^[0-9]{16}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.citizen_profiles ENABLE ROW LEVEL SECURITY;

-- 1. SELECT
-- Warga hanya dapat membaca profil NIK miliknya sendiri.
-- Super admin dapat membaca profil untuk keperluan pengawasan dan verifikasi.
CREATE POLICY citizen_profiles_select ON public.citizen_profiles
FOR SELECT
USING (
  auth.uid() = id
  OR public.is_super_admin()
);

-- 2. INSERT
-- Warga hanya dapat menambahkan profil NIK miliknya sendiri.
CREATE POLICY citizen_profiles_insert ON public.citizen_profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id
);

-- 3. UPDATE
-- Warga hanya dapat memperbarui profil NIK miliknya sendiri.
CREATE POLICY citizen_profiles_update ON public.citizen_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. DELETE
-- Warga dapat menghapus profil miliknya sendiri, atau dihapus oleh super admin.
CREATE POLICY citizen_profiles_delete ON public.citizen_profiles
FOR DELETE
USING (
  auth.uid() = id
  OR public.is_super_admin()
);

-- Trigger untuk sinkronisasi otomatis dari auth.users saat pendaftaran warga
CREATE OR REPLACE FUNCTION public.handle_new_citizen()
RETURNS trigger AS $$
BEGIN
  IF new.raw_user_meta_data->>'nik' IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.citizen_profiles
      WHERE nik = new.raw_user_meta_data->>'nik' AND id <> new.id
    ) THEN
      RAISE EXCEPTION 'NIK sudah terdaftar';
    END IF;

    INSERT INTO public.citizen_profiles (id, nik)
    VALUES (new.id, new.raw_user_meta_data->>'nik')
    ON CONFLICT (id) DO UPDATE SET nik = EXCLUDED.nik;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_citizen ON auth.users;

CREATE TRIGGER on_auth_user_created_citizen
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_citizen();

