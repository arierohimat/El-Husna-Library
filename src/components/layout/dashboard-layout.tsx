"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Book,
  Users,
  Bookmark,
  FileText,
  LogOut,
  Menu,
  ChevronLeft,
  Home,
  Bell,
  Settings,
  Library,
  Eye,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Sheet = dynamic(
  () => import("@/components/ui/sheet").then((mod) => mod.Sheet),
  { ssr: false },
);

const SheetContent = dynamic(
  () => import("@/components/ui/sheet").then((mod) => mod.SheetContent),
  { ssr: false },
);

const SheetTrigger = dynamic(
  () => import("@/components/ui/sheet").then((mod) => mod.SheetTrigger),
  { ssr: false },
);

const SheetTitle = dynamic(
  () => import("@/components/ui/sheet").then((mod) => mod.SheetTitle),
  { ssr: false },
);
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "ADMIN" | "MEMBER" | "WALIKELAS";
  userName: string;
}

export function DashboardLayout({
  children,
  userRole,
  userName,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const getDashboardHref = () => {
    if (userRole === "ADMIN") return "/dashboard/admin";
    if (userRole === "WALIKELAS") return "/dashboard/walikelas";
    return "/dashboard/member";
  };

  const navItems = [
    {
      label: "Dashboard",
      href: getDashboardHref(),
      icon: LayoutDashboard,
      roles: ["ADMIN", "MEMBER", "WALIKELAS"],
    },
    {
      label: "Buku",
      href: "/dashboard/books",
      icon: Book,
      roles: ["ADMIN", "MEMBER"],
    },
    {
      label: "Rak Buku",
      href: "/dashboard/bookshelves",
      icon: Library,
      roles: ["ADMIN", "MEMBER"],
    },
    {
      label: "Anggota",
      href: "/dashboard/members",
      icon: Users,
      roles: ["ADMIN"],
    },
    {
      label: "Peminjaman",
      href: "/dashboard/borrowings",
      icon: Bookmark,
      roles: ["ADMIN", "MEMBER"],
    },
    {
      label: "Monitoring Detail",
      href: "/dashboard/walikelas/monitoring",
      icon: Eye,
      roles: ["WALIKELAS"],
    },
    {
      label: "Progress Baca",
      href: "/dashboard/reading-progress",
      icon: TrendingUp,
      roles: ["MEMBER"],
    },
    {
      label: "Laporan",
      href: "/dashboard/reports",
      icon: FileText,
      roles: ["ADMIN"],
    },
    {
      label: "User",
      href: "/dashboard/users",
      icon: Users,
      roles: ["ADMIN"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole),
  );

  const SidebarContent = () => (
    <>
      {/* Logo Section with Enhanced Styling */}
      <div className="flex items-center justify-between px-5 py-6 border-b border-emerald-600/20">
        <Link
          href={getDashboardHref()}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all duration-300">
            <Book className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>

          {!collapsed && (
            <div>
              <h1 className="font-bold text-white leading-tight text-lg tracking-tight">
                El-Husna
              </h1>
              <p className="text-xs text-emerald-100 font-medium">
                Library System
              </p>
            </div>
          )}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-600/30 transition-all duration-200"
        >
          <ChevronLeft
            className={cn(
              "w-5 h-5 transition-transform duration-300",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive
                  ? "bg-white text-emerald-700 shadow-md shadow-emerald-500/10"
                  : "text-emerald-50 hover:bg-emerald-600/30 hover:text-white",
                collapsed && "justify-center",
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-r-full" />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 flex-shrink-0",
                  isActive ? "text-emerald-600" : "",
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {!collapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Actions */}
      <div className="p-4 border-t border-emerald-600/20 space-y-3">
        {!collapsed && (
          <div className="px-3 py-3 bg-emerald-600/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-500 flex items-center justify-center text-white font-bold shadow-lg">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {userName}
                </p>
                <p className="text-xs text-emerald-200 font-medium">
                  {userRole === "WALIKELAS" ? "Wali Kelas" : userRole}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleLogout}
          variant="ghost"
          className={cn(
            "w-full text-emerald-100 hover:bg-emerald-600/30 hover:text-white rounded-xl transition-all duration-200",
            collapsed ? "justify-center px-2" : "justify-start",
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2 font-medium">Logout</span>}
        </Button>
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-gray-50">
      {/* Desktop Sidebar with Enhanced Gradient */}
      <aside
        className={cn(
          "hidden lg:flex flex-col fixed h-screen transition-all duration-300 z-50",
          "bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800",
          "shadow-2xl shadow-emerald-900/20",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Enhanced Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex items-center justify-between px-4 shadow-lg z-50 backdrop-blur-sm">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-emerald-500/30 rounded-xl"
            >
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>

          <SheetContent
            side="left"
            className="w-72 p-0 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 text-white border-none"
          >
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarContent />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Book className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight">
            El-Husna Library
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-emerald-500/30 rounded-xl"
          >
            <Bell className="w-5 h-5" />
          </Button>
          <Link href="/">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-emerald-500/30 rounded-xl"
            >
              <Home className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content Area with Enhanced Spacing */}
      <main
        className={cn(
          "flex-1 min-h-screen transition-all duration-300",
          collapsed ? "lg:pl-20" : "lg:pl-72",
        )}
      >
        {/* Top Bar for Desktop */}
        <div className="hidden lg:block sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-40 shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {filteredNavItems.find((item) => item.href === pathname)
                  ?.label || "Dashboard"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Selamat Datang Kembali, {userName}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                className="text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                <Bell className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-20 lg:pt-0 pb-20 lg:pb-8 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Enhanced Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200 z-40 shadow-2xl">
        <div className="flex justify-around items-center h-20 px-2">
          {filteredNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center text-xs font-medium transition-all duration-200 relative py-2 px-4 rounded-xl",
                  isActive
                    ? "text-emerald-600"
                    : "text-gray-500 hover:text-emerald-500",
                )}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-emerald-600 rounded-b-full" />
                )}
                <Icon
                  className={cn("w-6 h-6 mb-1.5", isActive && "scale-110")}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
