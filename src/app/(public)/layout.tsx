// Layout for all public showcase pages — header + footer, no auth required.

import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Forethought
          </Link>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <Link href="/variables" className="hover:text-gray-900 transition-colors">
              Variables
            </Link>
            <Link href="/forecasters" className="hover:text-gray-900 transition-colors">
              Forecasters
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>
      <footer className="border-t border-gray-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center">
          <p className="text-xs text-gray-400">
            Forethought — transparent performance tracking for economic forecasters.
          </p>
        </div>
      </footer>
    </div>
  );
}
