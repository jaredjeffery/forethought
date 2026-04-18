// Layout for all public showcase pages — header + footer, no auth required.

import Link from "next/link";
import { auth } from "@/auth";
import { signOut } from "@/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b border-warm-border bg-cream">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex flex-col leading-none group">
            <span
              className="text-xl text-ink tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Forethought
            </span>
            <span
              className="block h-[2px] w-full mt-0.5 bg-amber transition-all duration-300 group-hover:w-3/4"
            />
          </Link>

          <nav className="flex items-center gap-7 text-sm text-muted">
            <Link href="/variables" className="hover:text-ink transition-colors">
              Variables
            </Link>
            <Link href="/forecasters" className="hover:text-ink transition-colors">
              Forecasters
            </Link>
            {session?.user ? (
              <>
                <Link href="/dashboard" className="hover:text-ink transition-colors">
                  Dashboard
                </Link>
                <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                  <button type="submit" className="hover:text-ink transition-colors">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/signin"
                className="px-3.5 py-1.5 text-xs font-medium tracking-wide bg-ink text-cream rounded hover:bg-amber transition-colors duration-200"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {children}
      </main>

      <footer className="border-t border-warm-border mt-24">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <p className="text-xs text-muted" style={{ fontFamily: "var(--font-display)" }}>
            Forethought
          </p>
          <p className="text-xs text-muted">
            Transparent performance tracking for economic forecasters.
          </p>
        </div>
      </footer>
    </div>
  );
}
