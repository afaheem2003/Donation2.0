"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { Heart, Search, Receipt, User, LogOut, Menu, X } from "lucide-react";

export function NavBar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-brand-600">
            <Heart className="w-5 h-5 fill-brand-500 stroke-brand-500" />
            GiveStream
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="text-gray-600 hover:text-brand-600 transition-colors">Feed</Link>
            <Link href="/discover" className="text-gray-600 hover:text-brand-600 transition-colors">Discover</Link>
            {session && (
              <Link href="/tax" className="text-gray-600 hover:text-brand-600 transition-colors">Tax Center</Link>
            )}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link
                  href={`/u/${session.user.username}`}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? ""}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-brand-600" />
                    </div>
                  )}
                  <span className="text-sm text-gray-700">{session.user.name?.split(" ")[0]}</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Sign in
              </button>
            )}
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden text-gray-600"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <Link href="/" className="block text-gray-700 hover:text-brand-600" onClick={() => setMenuOpen(false)}>Feed</Link>
          <Link href="/discover" className="block text-gray-700 hover:text-brand-600" onClick={() => setMenuOpen(false)}>Discover</Link>
          {session && (
            <>
              <Link href="/tax" className="block text-gray-700 hover:text-brand-600" onClick={() => setMenuOpen(false)}>Tax Center</Link>
              <Link href={`/u/${session.user.username}`} className="block text-gray-700 hover:text-brand-600" onClick={() => setMenuOpen(false)}>Profile</Link>
              <button onClick={() => signOut()} className="block text-gray-500 text-sm">Sign out</button>
            </>
          )}
          {!session && (
            <button
              onClick={() => signIn("google")}
              className="w-full bg-brand-600 text-white py-2 rounded-full text-sm font-medium"
            >
              Sign in with Google
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
