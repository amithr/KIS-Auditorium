"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

interface NavProps {
  admin?: boolean;
  onSignOut?: () => void;
  subtitle?: string;
}

export function Nav({
  admin = false,
  onSignOut,
  subtitle = "Period sign-up · 2026–27",
}: NavProps) {
  const pathname = usePathname();
  const onSchedule = pathname?.startsWith("/schedule");
  const onAdmin = pathname?.startsWith("/admin");

  return (
    <>
      <nav className={`nav ${styles.nav}`}>
        <div className={styles.brand}>
          <div className={styles.mark} aria-hidden>
            A
          </div>
          <div className={styles.brandText}>
            <div className={styles.title}>Auditorium</div>
            <div className={styles.sub}>{subtitle}</div>
          </div>
          {admin && <span className="tag tag-accent">ADMIN</span>}
        </div>
        <Link href="/schedule" aria-current={onSchedule ? "page" : undefined}>
          Schedule
        </Link>
        <Link href="/admin" aria-current={onAdmin ? "page" : undefined}>
          Admin
        </Link>
        {onSignOut && (
          <button type="button" className="btn btn-ghost" onClick={onSignOut}>
            Sign out
          </button>
        )}
      </nav>
      <div className="fade-rule" />
    </>
  );
}
