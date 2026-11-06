import type { DbClient, TableInsert, TableUpdate } from "./db";

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
