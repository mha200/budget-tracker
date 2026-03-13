import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, BarChart3, FileText } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Budget Tracker</h1>
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
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
          <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Take Control of
              <span className="text-primary block mt-1">Your Budget</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
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
          </div>
        </section>

        {/* Feature Cards */}
        <section className="max-w-6xl mx-auto px-4 pb-24">
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                    <Zap className="size-5" />
                  </span>
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

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="size-5" />
                  </span>
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

            <Card className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </span>
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
