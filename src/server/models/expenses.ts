import type { DbClient, TableInsert, TableUpdate } from "./db";
import type { TimestampRange } from "@/lib/year-summary";

export function insertExpense(db: DbClient, values: TableInsert<"expenses">) {
  return db.from("expenses").insert(values).select().single();
}

export function updateExpenseInProject(
  db: DbClient,
  projectId: string,
  expenseId: string,
  values: TableUpdate<"expenses">
) {
  return db
    .from("expenses")
    .update(values)
    .eq("id", expenseId)
    .eq("project_id", projectId);
}

export function deleteExpenseInProject(
  db: DbClient,
  projectId: string,
  expenseId: string
) {
  return db
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("project_id", projectId);
}

/** Nominal belanja proyek aktif milik instansi dalam rentang waktu [start, end). */
export function listAgencyExpenseAmounts(
  db: DbClient,
  agencyId: string,
  range: TimestampRange
) {
  return db
    .from("expenses")
    .select("amount, projects!inner (agency_id, archived_at)")
    .eq("projects.agency_id", agencyId)
    .is("projects.archived_at", null)
    .gte("spent_at", range.start)
    .lt("spent_at", range.end);
}
