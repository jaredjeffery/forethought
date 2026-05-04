// Layout for all public showcase pages — header + footer, no auth required.

import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header
        className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md"
        style={{ height: "var(--header-h)" }}
      >
        <div className="mx-auto flex h-full max-w-[var(--page-max)] items-center justify-between px-[var(--page-px)]">
          <nav className="hidden items-center gap-7 text-[14px] font-medium text-muted md:flex">
            <Link href="/variables" className="transition-colors hover:text-ink">
              Indicators
            </Link>
            <Link href="/forecasters" className="transition-colors hover:text-ink">
              Forecasters
            </Link>
            <Link href="/articles" className="transition-colors hover:text-ink">
              Articles
            </Link>
            <Link href="/methodology" className="transition-colors hover:text-ink">
              Methodology
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-ink">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-5">
            {session?.user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-[14px] font-medium text-muted transition-colors hover:text-ink"
                >
                  Dashboard
                </Link>
                <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
                  <button
                    type="submit"
                    className="text-[14px] font-medium text-muted transition-colors hover:text-ink"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link href="/signin" className="btn-primary">
                Sign in
              </Link>
            )}
            <Link href="/" className="flex items-center" aria-label="Farfield home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/farfield-lockup.png"
                alt="Farfield"
                width={196}
                height={56}
                className="h-[52px] w-auto"
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[var(--page-max)] px-[var(--page-px)] py-12">
        {children}
      </main>

      <footer className="mt-24 border-t border-border bg-surface-tint">
        <div className="mx-auto flex max-w-[var(--page-max)] flex-wrap items-center justify-between gap-3 px-[var(--page-px)] py-6">
          <p
            className="text-2xl tracking-tight text-ink"
            style={{ fontFamily: "var(--font-display)" }}
          >
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
