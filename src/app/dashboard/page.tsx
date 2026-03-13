import { auth } from "@/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, ArrowRight, Settings2, Scale, Camera, TrendingUp, TrendingDown, Minus } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getMonthName() {
  return new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function DashboardPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(" ")[0] || "there";

  const recentExpenses = await prisma.expense.findMany({
    take: 5,
    orderBy: { date: "desc" },
    include: {
      category: { include: { parent: true } },
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const monthlyIncome = await prisma.expense.aggregate({
    _sum: { amount: true },
    _count: true,
    where: {
      date: { gte: monthStart, lte: monthEnd },
      category: { type: "income" },
    },
  });

  const monthlySpending = await prisma.expense.aggregate({
    _sum: { amount: true },
    _count: true,
    where: {
      date: { gte: monthStart, lte: monthEnd },
      category: { type: { not: "income" } },
    },
  });

  const incomeTotal = monthlyIncome._sum.amount || 0;
  const spendingTotal = monthlySpending._sum.amount || 0;
  const netTotal = incomeTotal - spendingTotal;
  const spendRatio = incomeTotal > 0 ? Math.min(spendingTotal / incomeTotal, 1) : 0;

  function formatAmount(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="animate-fade-up stagger-1">
        <p className="text-sm font-medium tracking-wide uppercase text-muted-foreground">
          {getMonthName()}
        </p>
        <h2 className="font-display text-4xl mt-1">
          {getGreeting()}, {firstName}
        </h2>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="summary-card-income animate-fade-up stagger-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="size-3.5" />
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl text-green-700">
              {formatAmount(incomeTotal)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {monthlyIncome._count} transaction{monthlyIncome._count !== 1 ? "s" : ""} this month
            </p>
          </CardContent>
        </Card>

        <Card className="summary-card-spending animate-fade-up stagger-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="size-3.5" />
              Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">
              {formatAmount(spendingTotal)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {monthlySpending._count} transaction{monthlySpending._count !== 1 ? "s" : ""} this month
            </p>
          </CardContent>
        </Card>

        <Card className={`animate-fade-up stagger-4 ${netTotal >= 0 ? "summary-card-net-positive" : "summary-card-net-negative"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Minus className="size-3.5" />
              Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-display text-3xl ${netTotal >= 0 ? "text-green-700" : "text-red-600"}`}>
              {netTotal >= 0 ? "+" : ""}{formatAmount(netTotal)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {netTotal >= 0 ? "surplus" : "deficit"} for the month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Utilization Bar */}
      {incomeTotal > 0 && (
        <div className="animate-fade-up stagger-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Monthly spend rate</p>
            <p className="text-sm text-muted-foreground">
              {Math.round(spendRatio * 100)}% of income
            </p>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                spendRatio > 0.9
                  ? "bg-red-500"
                  : spendRatio > 0.7
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${spendRatio * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="animate-fade-up stagger-4">
        <h3 className="text-sm font-medium tracking-wide uppercase text-muted-foreground mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button
            variant="outline"
            render={<Link href="/dashboard/expenses/new" />}
            nativeButton={false}
            className="h-auto py-4 flex-col gap-2 font-normal"
          >
            <PlusCircle className="size-5 text-primary" />
            <span className="text-xs">Add Transaction</span>
          </Button>
          <Button
            variant="outline"
            render={<Link href="/dashboard/expenses/receipt" />}
            nativeButton={false}
            className="h-auto py-4 flex-col gap-2 font-normal"
          >
            <Camera className="size-5 text-primary" />
            <span className="text-xs">Scan Receipt</span>
          </Button>
          <Button
            variant="outline"
            render={<Link href="/dashboard/budget" />}
            nativeButton={false}
            className="h-auto py-4 flex-col gap-2 font-normal"
          >
            <Scale className="size-5 text-primary" />
            <span className="text-xs">Budget vs. Actual</span>
          </Button>
          <Button
            variant="outline"
            render={<Link href="/dashboard/budget/master" />}
            nativeButton={false}
            className="h-auto py-4 flex-col gap-2 font-normal"
          >
            <Settings2 className="size-5 text-primary" />
            <span className="text-xs">Set Budget</span>
          </Button>
        </div>
      </div>

      {/* Recent Transactions */}
      <Card className="animate-fade-up stagger-5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-xl">Recent Transactions</CardTitle>
            {recentExpenses.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard/expenses" />}
                nativeButton={false}
                className="gap-1 text-xs"
              >
                View All <ArrowRight className="size-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentExpenses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                No transactions yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                render={<Link href="/dashboard/expenses/new" />}
                nativeButton={false}
                className="mt-3 gap-1.5"
              >
                <PlusCircle className="size-3.5" />
                Add your first transaction
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-medium text-muted-foreground">
                      {(expense.category.parent?.name || expense.category.name).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {expense.description ||
                          (expense.category.parent
                            ? `${expense.category.parent.name} > ${expense.category.name}`
                            : expense.category.name)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {expense.category.parent
                          ? `${expense.category.parent.name} > ${expense.category.name}`
                          : expense.category.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium text-sm tabular-nums">
                      {formatAmount(expense.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(expense.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
