"use client";

import { usePathname } from "next/navigation";

export default function MainFooter() {
  const pathname = usePathname();
  
  if (pathname && (pathname.startsWith("/portal") || pathname.startsWith("/super-admin"))) {
    return null;
  }

  return (
    <footer style={{ marginTop: 'auto', padding: '2rem 0', textAlign: 'center', borderTop: '1px solid var(--secondary)' }}>
      <p className="text-muted">© {new Date().getFullYear()} شهاداتي للأنظمة التعليمية. جميع الحقوق محفوظة.</p>
    </footer>
  );
}
