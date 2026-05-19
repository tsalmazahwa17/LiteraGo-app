"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchCartItems, fetchCurrentUser } from "@/lib/supabase-store";
import { navItems } from "@/lib/data";
import Icon from "./Icon";
import Logo from "./Logo";

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function refresh() {
      const [cartItems, currentUser] = await Promise.all([fetchCartItems(), fetchCurrentUser()]);
      setCartCount(cartItems.reduce((total, item) => total + (item.qty || 1), 0));
      setUser(currentUser);
    }

    refresh();
    window.addEventListener("literago:cart", refresh);
    window.addEventListener("literago:user", refresh);
    return () => {
      window.removeEventListener("literago:cart", refresh);
      window.removeEventListener("literago:user", refresh);
    };
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo
          href="/home"
          ariaLabel="Kembali ke homepage LiteraGo"
          onClick={closeMenu}
        />
        <button className="hamburger" aria-label="Buka menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <span />
          <span />
          <span />
        </button>
        <nav className={`main-nav ${open ? "open" : ""}`}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
              onClick={closeMenu}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link href="/notifications" className="icon-btn" aria-label="Notifikasi">
            <Icon name="bell" size={18} />
          </Link>
          <Link href="/cart" className="icon-btn cart-btn" aria-label="Keranjang">
            <Icon name="shopping" size={18} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          <Link href="/profile" className="avatar" aria-label="Akun">
            {user?.username?.slice(0, 1)?.toUpperCase() || user?.name?.slice(0, 1)?.toUpperCase() || <Icon name="user" size={18} />}
          </Link>
        </div>
      </div>
    </header>
  );
}
