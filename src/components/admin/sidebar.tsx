"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  LogOut,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";

interface SidebarProps {
  userName: string;
  userEmail: string;
  userRole: string;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/team", label: "Team", icon: Users },
];

export function Sidebar({ userName, userEmail, userRole }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    return href === "/dashboard"
      ? pathname === "/dashboard" || pathname.startsWith("/questionnaires")
      : pathname.startsWith(href);
  }

  const navLinks = (
    <>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-brand-50 text-brand-700"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-stone-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-stone-900 truncate">{userName}</p>
          <p className="text-xs text-stone-400 truncate">{userEmail}</p>
          {userRole === "ADMIN" && (
            <span className="text-xs text-brand-600 font-medium">Admin</span>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 inset-x-0 h-14 z-30 flex items-center justify-between px-4 bg-white border-b border-stone-200">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={() => setMobileOpen(false)}
        >
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <ClipboardList className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-semibold text-stone-900">Survey</span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className={cn(
          "md:hidden fixed top-0 left-0 h-full w-64 z-50 flex flex-col bg-white border-r border-stone-200 transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-stone-900 text-lg">Survey</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {navLinks}
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-64 flex-shrink-0 flex-col bg-white border-r border-stone-200 h-full">
        <div className="px-6 py-5 border-b border-stone-100">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-stone-900 text-lg">Survey</span>
          </Link>
        </div>
        {navLinks}
      </aside>
    </>
  );
}
