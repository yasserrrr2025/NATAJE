"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function MainHeader() {
  const pathname = usePathname();
  
  // Hide public chrome on isolated app surfaces.
  if (pathname && (pathname.startsWith("/portal") || pathname.startsWith("/super-admin") || pathname.startsWith("/print"))) {
    return null;
  }

  return (
    <header className="app-header">
      <div className="header-container page-container flex-between" style={{ padding: '1rem' }}>
        <div className="logo flex-center" style={{ gap: '0.75rem' }}>
          <img 
            src="https://upload.wikimedia.org/wikipedia/ar/1/17/Saudi_Ministry_of_Education_Logo_2025.png" 
            alt="وزارة التعليم" 
            style={{ height: '40px', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.05em' }}>شهاداتي</span>
        </div>
        <nav className="header-nav flex-center" style={{ gap: '1.5rem' }}>
          <Link href="/" style={{ fontWeight: 600 }}>الرئيسية</Link>
          <Link href="/login" className="btn btn-secondary">دخول المدارس</Link>
        </nav>
      </div>
    </header>
  );
}
