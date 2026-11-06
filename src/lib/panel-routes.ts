/** Halaman awal panel setelah login, sesuai peran akun pengelola. */
export function panelHomeForRole(role: string): string {
  return role === "super_admin" ? "/super-admin" : "/admin";
}
