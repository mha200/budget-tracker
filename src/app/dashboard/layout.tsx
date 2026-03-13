import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DashboardNav } from "./nav";

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
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Budget Tracker</h1>
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
      <DashboardNav />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        {children}
      </main>
    </div>
  );
}
