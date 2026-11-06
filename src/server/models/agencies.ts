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
