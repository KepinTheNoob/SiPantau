import type { DbClient } from "./db";

export function findProfileById(db: DbClient, userId: string) {
  return db.from("profiles").select("*").eq("id", userId).maybeSingle();
}

export function findProfileRole(db: DbClient, userId: string) {
  return db.from("profiles").select("role").eq("id", userId).maybeSingle();
}
