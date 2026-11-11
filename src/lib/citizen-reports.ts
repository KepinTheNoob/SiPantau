/** Tanggapan tertulis instansi atas satu laporan warga. */
export type CitizenReportReplyView = {
  readonly id: string;
  readonly body: string;
  readonly createdAt: string;
};

/** Laporan warga beserta tanggapan instansi (urut dari tanggapan pertama). */
export type CitizenReportView = {
  readonly id: string;
  readonly content: string;
  readonly photoPath: string | null;
  readonly createdAt: string;
  readonly replies: readonly CitizenReportReplyView[];
};

export type CitizenReportRowWithReplies = {
  readonly id: string;
  readonly content: string;
  readonly photo_path: string | null;
  readonly created_at: string;
  readonly citizen_report_replies: readonly {
    readonly id: string;
    readonly body: string;
    readonly created_at: string;
  }[];
};

export function toCitizenReportView(
  row: CitizenReportRowWithReplies
): CitizenReportView {
  return {
    id: row.id,
    content: row.content,
    photoPath: row.photo_path,
    createdAt: row.created_at,
    replies: row.citizen_report_replies
      .map((reply) => ({
        id: reply.id,
        body: reply.body,
        createdAt: reply.created_at,
      }))
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt)),
  };
}

/** Laporan dianggap sudah diproses bila instansi sudah menulis minimal satu tanggapan. */
export function hasAgencyReply(
  report: Pick<CitizenReportView, "replies">
): boolean {
  return report.replies.length > 0;
}

/** Batas panjang tanggapan; sama dengan CHECK di tabel citizen_report_replies. */
export const REPLY_MIN_LENGTH = 20;

export const REPLY_MAX_LENGTH = 2000;

/** Jumlah laporan warga per halaman di daftar laporan (publik, panel, dasbor). */
export const CITIZEN_REPORTS_PER_PAGE = 5;
