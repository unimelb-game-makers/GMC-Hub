import Link from "next/link";

const LINKS = [
  { href: "/reimbursements", label: "Reimbursements" },
  { href: "/events", label: "Events" },
  { href: "/attendance", label: "Attendance" },
  { href: "/voting", label: "Voting" },
];

export function NavLinks({ stacked = false }: { stacked?: boolean }) {
  return (
    <>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            stacked
              ? "rounded-lg px-2 py-2 text-nav-ink/80 transition-colors hover:bg-nav-ink/10 hover:text-nav-ink"
              : "text-nav-ink/70 transition-colors hover:text-nav-ink"
          }
        >
          {link.label}
        </Link>
      ))}
    </>
  );
}
