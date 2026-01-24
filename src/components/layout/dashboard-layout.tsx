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
  X,
  Home,
  ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole: "ADMIN" | "MEMBER";
  userName: string;
}

export function DashboardLayout({
  children,
  userRole,
  userName,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    {
      label: "Dashboard",
      href: userRole === "ADMIN" ? "/dashboard/admin" : "/dashboard/member",
      icon: LayoutDashboard,
      roles: ["ADMIN", "MEMBER"],
    },
    {
      label: "Buku",
      href: "/dashboard/books",
      icon: Book,
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
      label: "Laporan",
      href: "/dashboard/reports",
      icon: FileText,
      roles: ["ADMIN"],
    },
    {
      label: "Manajemen User",
      href: "/dashboard/users",
      icon: Users,
      roles: ["ADMIN"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(userRole),
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-green-700 text-white fixed h-screen">
        <div className="p-6 border-b border-green-600">
          <Link
            href={
              userRole === "ADMIN" ? "/dashboard/admin" : "/dashboard/member"
            }
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Book className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">El-Husna</h1>
              <p className="text-xs text-green-100">Library</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-white text-green-700 font-medium"
                    : "text-green-100 hover:bg-green-600",
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-green-600">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <span className="font-semibold">
                {userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              <p className="text-xs text-green-200 capitalize">
                {userRole.toLowerCase()}
              </p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start text-green-100 hover:text-white hover:bg-green-600"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-green-700 text-white z-40 flex items-center justify-between px-4 shadow-lg">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-green-600"
              >
                {sidebarOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 p-0 bg-green-700 text-white border-r-0"
            >
              <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-green-600">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <Book className="w-6 h-6 text-green-700" />
                    </div>
                    <div>
                      <h1 className="font-bold text-lg leading-tight">
                        El-Husna
                      </h1>
                      <p className="text-xs text-green-100">Library</p>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                  {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                          isActive
                            ? "bg-white text-green-700 font-medium"
                            : "text-green-100 hover:bg-green-600",
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="p-4 border-t border-green-600">
                  <div className="flex items-center gap-3 mb-4 px-4">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="font-semibold">
                        {userName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{userName}</p>
                      <p className="text-xs text-green-200 capitalize">
                        {userRole.toLowerCase()}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start text-green-100 hover:text-white hover:bg-green-600"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Book className="w-5 h-5 text-green-700" />
            </div>
            <span className="font-bold">El-Husna Library</span>
          </div>
        </div>
        <Link href="/">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-green-600"
          >
            <Home className="w-5 h-5" />
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <div className="pt-16 lg:pt-0 p-4 lg:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex items-center justify-around h-16">
          {filteredNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px]",
                  isActive
                    ? "text-green-600"
                    : "text-gray-500 hover:text-gray-700",
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
