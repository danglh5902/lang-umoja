export function isAdminRequest(req: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return req.headers.get("x-admin-password") === password;
}
