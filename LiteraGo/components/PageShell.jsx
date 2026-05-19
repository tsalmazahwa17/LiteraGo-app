import Header from "./Header";
import MobileBottomNav from "./MobileBottomNav";

export default function PageShell({ children, className = "" }) {
  return (
    <>
      <Header />
      <main className={`page-shell ${className}`}>{children}</main>
      <MobileBottomNav />
    </>
  );
}
