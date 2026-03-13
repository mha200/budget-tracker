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
import { PlusCircle, ArrowRight, Settings2, Scale } from "lucide-react";
import { OnboardingTour } from "@/components/onboarding-tour";

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
    <div className="space-y-6">
      <OnboardingTour />
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Welcome, {firstName}!</h2>
        <Button
          data-tour="add-transaction"
          render={<Link href="/dashboard/expenses/new" />}
          nativeButton={false}
          className="gap-1.5"
        >
          <PlusCircle className="size-4" />
          Add Transaction
        </Button>
      </div>

      {/* Monthly Summary */}
      <div data-tour="summary-cards" className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month&apos;s Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {formatAmount(incomeTotal)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {monthlyIncome._count} transaction{monthlyIncome._count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month&apos;s Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatAmount(spendingTotal)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {monthlySpending._count} transaction{monthlySpending._count !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${netTotal >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netTotal >= 0 ? "+" : ""}{formatAmount(netTotal)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {netTotal >= 0 ? "surplus" : "deficit"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card data-tour="quick-actions">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            render={<Link href="/dashboard/expenses/new" />}
            nativeButton={false}
            className="gap-2"
          >
            <PlusCircle className="size-4" />
            Add a transaction
          </Button>
          <Button
            variant="outline"
            render={<Link href="/dashboard/expenses" />}
            nativeButton={false}
            className="gap-2"
          >
            <ArrowRight className="size-4" />
            View all transactions
          </Button>
          <Button
            variant="outline"
            render={<Link href="/dashboard/budget" />}
            nativeButton={false}
            className="gap-2"
          >
            <Scale className="size-4" />
            Budget vs. Actual
          </Button>
          <Button
            variant="outline"
            render={<Link href="/dashboard/budget/master" />}
            nativeButton={false}
            className="gap-2"
          >
            <Settings2 className="size-4" />
            Set up your budget
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            {recentExpenses.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                render={<Link href="/dashboard/expenses" />}
                nativeButton={false}
                className="gap-1"
              >
                View All <ArrowRight className="size-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentExpenses.length === 0 ? (
            <p className="text-muted-foreground text-sm py-2">
              No transactions yet.{" "}
              <Link
                href="/dashboard/expenses/new"
                className="text-primary underline"
              >
                Add your first transaction
              </Link>
              .
            </p>
          ) : (
            <div className="divide-y">
              {recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <span className="font-medium">
                      {formatAmount(expense.amount)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2 rounded bg-muted px-1.5 py-0.5">
                      {expense.category.parent
                        ? `${expense.category.parent.name} > ${expense.category.name}`
                        : expense.category.name}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(expense.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
