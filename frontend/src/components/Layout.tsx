import { Link, Outlet, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";

export default function Layout() {
  const location = useLocation();
  const isFullBleed = location.pathname === "/" || location.pathname.startsWith("/result/");

  if (isFullBleed) {
    return (
      <div className="h-screen overflow-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="no-underline">
            <Logo />
          </Link>
          <nav className="flex gap-4">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-foreground ${
                location.pathname === "/"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Upload
            </Link>
            <Link
              to="/gallery"
              className={`text-sm font-medium transition-colors hover:text-foreground ${
                location.pathname === "/gallery"
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Gallery
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        For entertainment purposes only. Not affiliated with Sir David
        Attenborough.
      </footer>
    </div>
  );
}
