import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.LIZZIE_API_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Spending by category this month
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startOfMonth } },
    include: { category: true },
  });

  // Budgets for this month
  const budgets = await prisma.budget.findMany({
    where: { year, month },
    include: { category: true },
  });

  // Roll up spending by category
  const spendingByCategory: Record<string, number> = {};
  for (const e of expenses) {
    const name = e.category.name;
    spendingByCategory[name] = (spendingByCategory[name] || 0) + e.amount;
  }

  // Compare to budgets
  const summary = budgets.map((b) => ({
    category: b.category.name,
    budgeted: b.amount,
    spent: spendingByCategory[b.category.name] || 0,
    remaining: b.amount - (spendingByCategory[b.category.name] || 0),
    overBudget: (spendingByCategory[b.category.name] || 0) > b.amount,
  }));

  const overBudget = summary.filter((s) => s.overBudget);
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({
    month: `${year}-${String(month).padStart(2, "0")}`,
    totalSpent,
    overBudgetCategories: overBudget,
    summary,
  });
}
