export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class UnauthorizedError extends AuthError {
  constructor(message = "Pengguna belum login atau sesi telah kedaluwarsa.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AuthError {
  constructor(
    message = "Akses ditolak: Anda tidak memiliki izin yang diperlukan."
  ) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ProjectNotFoundError extends AuthError {
  constructor(message = "Proyek tidak ditemukan.") {
    super(message);
    this.name = "ProjectNotFoundError";
  }
}

export class AgencyAccessDeniedError extends AuthError {
  constructor(message = "Akses ditolak: Proyek bukan milik instansi Anda.") {
    super(message);
    this.name = "AgencyAccessDeniedError";
  }
}

export class UnverifiedAgencyError extends AuthError {
  constructor(
    message = "Akses ditolak: Instansi Anda belum terverifikasi oleh Super Admin."
  ) {
    super(message);
    this.name = "UnverifiedAgencyError";
  }
}
