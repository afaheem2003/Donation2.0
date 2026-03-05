"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import {
  Heart,
  LayoutDashboard,
  FileText,
  Building2,
  Users,
  LogOut,
  User,
  X,
  Shield,
  Wrench,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard",    href: "/admin",              icon: LayoutDashboard },
  { label: "Applications", href: "/admin/applications", icon: FileText },
  { label: "Nonprofits",   href: "/admin/nonprofits",   icon: Building2 },
  { label: "Users",        href: "/admin/users",        icon: Users },
  ...(process.env.NODE_ENV !== "production"
    ? [{ label: "Dev Tools", href: "/admin/dev-tools", icon: Wrench }]
    : []),
];

interface AdminSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  pendingCount?: number;
}

export function AdminSidebar({ mobileOpen, onMobileClose, pendingCount }: AdminSidebarProps) {
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
        <button
          className="md:hidden text-gray-400 hover:text-gray-600 transition-colors"
          onClick={onMobileClose}
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Admin badge */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-violet-600" />
          <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">Platform Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname === href || pathname.startsWith(href + "/");
          const isDevTools = label === "Dev Tools";
          const activeClass = isDevTools
            ? "bg-amber-50 text-amber-700 font-semibold"
            : "bg-violet-50 text-violet-700 font-semibold";
          const inactiveClass = isDevTools
            ? "text-amber-600 hover:bg-amber-50"
            : "text-gray-600 hover:bg-gray-100";
          const activeIconClass = isDevTools ? "text-amber-500" : "text-violet-600";
          const inactiveIconClass = isDevTools ? "text-amber-400" : "text-gray-400";
          return (
            <div key={href}>
              {isDevTools && (
                <div className="border-t border-dashed border-gray-200 my-1" />
              )}
              <Link
                href={href}
                onClick={onMobileClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? activeClass : inactiveClass
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? activeIconClass : inactiveIconClass}`} />
                <span className="flex-1">{label}</span>
                {label === "Applications" && (pendingCount ?? 0) > 0 && (
                  <span className="text-xs font-bold bg-yellow-100 text-yellow-700 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
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
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-violet-600" />
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

      {/* Mobile slide-in */}
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
