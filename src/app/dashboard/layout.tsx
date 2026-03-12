import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LayoutDashboard, PlusCircle, List, Scale, Settings2 } from "lucide-react";

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/expenses/new", label: "Add Expense", icon: PlusCircle },
  { href: "/dashboard/expenses", label: "Expenses", icon: List },
  { href: "/dashboard/budget", label: "Budget", icon: Scale },
  { href: "/dashboard/budget/master", label: "Set Budget", icon: Settings2 },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Budget Tracker</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user.name || session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <nav className="border-b bg-muted/40">
        <div className="max-w-6xl mx-auto px-4 flex gap-1">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-none border-b-2 border-transparent py-2.5 h-auto"
              render={<Link href={link.href} />}
              nativeButton={false}
            >
              <link.icon className="size-4" />
              {link.label}
            </Button>
          ))}
        </div>
      </nav>
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {children}
      </main>
    </div>
  );
}
