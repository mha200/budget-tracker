"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, PlusCircle, List, Upload, Scale, Settings2, BarChart3, Repeat } from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/expenses/new", label: "Add Transaction", icon: PlusCircle, exact: true },
  { href: "/dashboard/expenses", label: "Transactions", icon: List, exact: true },
  { href: "/dashboard/expenses/import", label: "Import CSV", icon: Upload, exact: true },
  { href: "/dashboard/budget", label: "Budget", icon: Scale, exact: true },
  { href: "/dashboard/budget/master", label: "Set Budget", icon: Settings2, exact: true },
  { href: "/dashboard/charts", label: "Charts", icon: BarChart3, exact: true },
  { href: "/dashboard/expenses/recurring", label: "Recurring", icon: Repeat, exact: true },
];

export function DashboardNav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav data-tour="nav" className="border-b bg-muted/40">
      <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {navLinks.map((link) => {
          const active = isActive(link.href, link.exact);
          return (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              className={`gap-1.5 rounded-none border-b-2 py-2.5 h-auto shrink-0 ${
                active
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              render={<Link href={link.href} />}
              nativeButton={false}
            >
              <link.icon className="size-4" />
              {link.label}
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
