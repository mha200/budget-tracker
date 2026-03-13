import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Zap, BarChart3, FileText, Camera } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-xl text-primary">Budget Tracker</h1>
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
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.47_0.13_195/0.08),transparent_70%)]" />
          <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32 text-center animate-fade-up stagger-1">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-4">
              Personal Finance, Simplified
            </p>
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight mb-6">
              Take Control of
              <span className="text-primary block mt-2">Your Budget</span>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="relative overflow-hidden animate-fade-up stagger-2">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                    <Zap className="size-5" />
                  </span>
                  <span className="font-display text-lg">Quick Entry</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Add an expense in under 5 seconds from your phone. No more
                  navigating through spreadsheet tabs.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden animate-fade-up stagger-3">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                    <Camera className="size-5" />
                  </span>
                  <span className="font-display text-lg">Receipt Scanner</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  Snap a photo of any receipt or upload a PDF. AI extracts the
                  merchant, amount, and date automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden animate-fade-up stagger-4">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                    <BarChart3 className="size-5" />
                  </span>
                  <span className="font-display text-lg">Instant Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  See your budget vs. actual spending at a glance with
                  color-coded progress bars and charts.
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden animate-fade-up stagger-5">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 to-primary" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span className="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-5" />
                  </span>
                  <span className="font-display text-lg">Statement Import</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
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
