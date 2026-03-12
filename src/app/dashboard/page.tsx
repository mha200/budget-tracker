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

  const monthlyTotal = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: {
      date: { gte: monthStart, lte: monthEnd },
    },
  });

  const monthlyCount = await prisma.expense.count({
    where: {
      date: { gte: monthStart, lte: monthEnd },
    },
  });

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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Welcome, {firstName}!</h2>
        <Button
          render={<Link href="/dashboard/expenses/new" />}
          nativeButton={false}
          className="gap-1.5"
        >
          <PlusCircle className="size-4" />
          Add Expense
        </Button>
      </div>

      {/* Monthly Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Month&apos;s Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatAmount(monthlyTotal._sum.amount || 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {monthlyCount} expense{monthlyCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              variant="outline"
              render={<Link href="/dashboard/expenses/new" />}
              nativeButton={false}
              className="justify-start gap-2"
            >
              <PlusCircle className="size-4" />
              Add an expense
            </Button>
            <Button
              variant="outline"
              render={<Link href="/dashboard/expenses" />}
              nativeButton={false}
              className="justify-start gap-2"
            >
              <ArrowRight className="size-4" />
              View all expenses
            </Button>
            <Button
              variant="outline"
              render={<Link href="/dashboard/budget" />}
              nativeButton={false}
              className="justify-start gap-2"
            >
              <Scale className="size-4" />
              Budget vs. Actual
            </Button>
            <Button
              variant="outline"
              render={<Link href="/dashboard/budget/master" />}
              nativeButton={false}
              className="justify-start gap-2"
            >
              <Settings2 className="size-4" />
              Set up your budget
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Expenses</CardTitle>
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
              No expenses yet.{" "}
              <Link
                href="/dashboard/expenses/new"
                className="text-primary underline"
              >
                Add your first expense
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
                    <span className="text-xs text-muted-foreground ml-2 rounded bg-muted px-1.5 py-0.5">
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
