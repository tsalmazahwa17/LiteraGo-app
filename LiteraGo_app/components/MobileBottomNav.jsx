"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/data";
import Icon from "./Icon";

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Navigasi bawah">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
          <Icon name={item.icon} size={22} />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
