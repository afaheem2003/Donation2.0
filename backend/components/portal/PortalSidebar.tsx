"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import {
  Heart,
  LayoutDashboard,
  Megaphone,
  CreditCard,
  Banknote,
  BarChart3,
  Building2,
  Users,
  LogOut,
  User,
  X,
  Menu,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Campaigns", href: "/portal/campaigns", icon: Megaphone },
  { label: "Donations", href: "/portal/donations", icon: CreditCard },
  { label: "Payouts", href: "/portal/payouts", icon: Banknote },
  { label: "Analytics", href: "/portal/analytics", icon: BarChart3 },
  { label: "Profile", href: "/portal/profile", icon: Building2 },
  { label: "Team", href: "/portal/team", icon: Users },
];

interface PortalSidebarProps {
  orgName?: string;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function PortalSidebar({ orgName, mobileOpen, onMobileClose }: PortalSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-brand-600"
          onClick={onMobileClose}
        >
          <Heart className="w-5 h-5 fill-brand-500 stroke-brand-500" />
          GiveStream
        </Link>
        {/* Close button (mobile only) */}
        <button
          className="md:hidden text-gray-400 hover:text-gray-600 transition-colors"
          onClick={onMobileClose}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Org label */}
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-0.5">Portal</p>
        <p className="text-sm font-semibold text-gray-800 truncate">
          {orgName ?? "Your Organization"}
        </p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-brand-600" : "text-gray-400"}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + sign out */}
      <div className="px-3 pb-5 pt-3 border-t border-gray-100 space-y-2">
        {session?.user && (
          <div className="flex items-center gap-3 px-3 py-2">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={32}
                height={32}
                className="rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-brand-600" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{session.user.name}</p>
              <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors w-full"
        >
          <LogOut className="w-4 h-4 text-gray-400 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-white border-r border-gray-200 h-full">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile slide-in sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
