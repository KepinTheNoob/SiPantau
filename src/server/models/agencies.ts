import type { DbClient } from "./db";

export function findAgencyById(db: DbClient, agencyId: string) {
  return db.from("agencies").select("*").eq("id", agencyId).maybeSingle();
}

export function setAgencyVerified(
  db: DbClient,
  agencyId: string,
  verified: boolean
) {
  return db.from("agencies").update({ verified }).eq("id", agencyId);
}

export function listVerifiedAgencies(db: DbClient) {
  return db
    .from("agencies")
    .select("id, name, slug, region")
    .eq("verified", true)
    .order("name", { ascending: true });
}
