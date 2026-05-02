// Layout for all public showcase pages — header + footer, no auth required.

import Link from "next/link";
import { auth } from "@/auth";
import { signOut } from "@/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header
        className="border-b border-border bg-surface/90 backdrop-blur-sm sticky top-0 z-10"
        style={{ boxShadow: "0 1px 0 #E5E7EB" }}
      >
        <div className="max-w-[1280px] mx-auto px-8 h-[64px] flex items-center justify-between">
          <Link href="/" className="flex flex-col leading-none group">
            <span
              className="text-xl text-ink tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Farfield
            </span>
            <span className="block h-[2.5px] w-full mt-0.5 bg-accent transition-all duration-300 group-hover:w-3/4" />
          </Link>

          <nav className="flex items-center gap-8">
            <div className="flex items-center gap-6 text-[15px] font-medium text-muted">
              <Link href="/variables" className="hover:text-ink transition-colors">
                Variables
              </Link>
              <Link href="/forecasters" className="hover:text-ink transition-colors">
                Forecasters
              </Link>
              <Link href="/articles" className="hover:text-ink transition-colors">
                Articles
              </Link>
              <Link href="/methodology" className="hover:text-ink transition-colors">
                Methodology
              </Link>
              <Link href="/pricing" className="hover:text-ink transition-colors">
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {session?.user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="text-[15px] font-medium text-muted hover:text-ink transition-colors"
                  >
                    Dashboard
                  </Link>
                  <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                    <button
                      type="submit"
                      className="text-[15px] font-medium text-muted hover:text-ink transition-colors"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/signin"
                  className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-[10px] hover:bg-accent-dark transition-colors duration-200"
                  style={{ boxShadow: "0 1px 3px rgba(29, 78, 216, 0.3)" }}
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-8 py-12">
        {children}
      </main>

      <footer className="border-t border-border mt-24">
        <div className="max-w-[1280px] mx-auto px-8 h-14 flex items-center justify-between">
          <p className="text-sm font-medium text-muted" style={{ fontFamily: "var(--font-display)" }}>
            Farfield
          </p>
          <p className="text-sm text-muted">
            Transparent performance tracking for economic forecasters.
          </p>
        </div>
      </footer>
    </div>
  );
}
