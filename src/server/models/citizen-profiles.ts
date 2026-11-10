import type { DbClient } from "./db";

export function findCitizenProfileById(db: DbClient, userId: string) {
  return db
    .from("citizen_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
}

export function findCitizenProfileByNik(db: DbClient, nik: string) {
  return db
    .from("citizen_profiles")
    .select("*")
    .eq("nik", nik)
    .maybeSingle();
}

