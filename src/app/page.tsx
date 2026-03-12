import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Budget Tracker</h1>
          <div className="flex gap-3">
            <Button variant="ghost" nativeButton={false} render={<Link href="/auth/signin" />}>
              Sign In
            </Button>
            <Button nativeButton={false} render={<Link href="/auth/signup" />}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Take Control of Your Budget
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Replace your complex spreadsheets with a purpose-built budget
            tracker. Enter expenses in seconds, see insights instantly, and
            import bank statements automatically.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" nativeButton={false} render={<Link href="/auth/signup" />}>
              Get Started Free
            </Button>
            <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/auth/signin" />}>
              Sign In
            </Button>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="max-w-6xl mx-auto px-4 pb-20">
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  Quick Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Add an expense in under 5 seconds from your phone. No more
                  navigating through spreadsheet tabs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Instant Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  See your budget vs. actual spending at a glance with
                  color-coded progress bars and charts.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">📄</span>
                  Statement Import
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Upload bank and credit card statements. Transactions are
                  auto-categorized and ready for review.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Budget Tracker &mdash; Built with Next.js, Prisma, and Neon</p>
      </footer>
    </div>
  );
}
