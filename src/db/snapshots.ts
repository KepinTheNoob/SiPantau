export type ProjectSnapshot = {
  readonly id: string;
  readonly agency_id: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly location_name: string;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly budget_total: number | string;
  readonly start_date: string;
  readonly target_end_date: string;
  readonly archived_at: string | null;
  readonly created_at: string;
};

export type LandmarkSnapshot = {
  readonly id: string;
  readonly project_id: string;
  readonly name: string;
  readonly position: number;
  readonly weight: number;
  readonly done: boolean;
  readonly done_at: string | null;
  readonly evidence_path: string | null;
  readonly created_at: string;
};

export type ExpenseSnapshot = {
  readonly id: string;
  readonly project_id: string;
  readonly landmark_id: string | null;
  readonly amount: number | string;
  readonly note: string;
  readonly evidence_path: string | null;
  readonly spent_at: string;
  readonly created_at: string;
};

export type EntitySnapshot =
  ProjectSnapshot | LandmarkSnapshot | ExpenseSnapshot;
