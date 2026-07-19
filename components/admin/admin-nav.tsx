import Link from "next/link";

const links = [
  ["Users", "/workspace/admin/users"],
  ["Roles & permissions", "/workspace/admin/roles"],
  ["Login history", "/workspace/admin/login-history"],
  ["Audit logs", "/workspace/admin/audit-logs"],
] as const;

export function AdminNav() {
  return (
    <nav
      aria-label="Administration"
      className="flex gap-2 overflow-x-auto border-b pb-3"
    >
      {links.map(([label, href]) => (
        <Link
          key={href}
          href={href}
          className="min-h-11 shrink-0 rounded-lg px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
