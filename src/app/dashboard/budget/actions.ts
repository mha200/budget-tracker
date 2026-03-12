"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type BudgetLineItem = {
  categoryId: string;
  categoryName: string;
  type: string;
  parentId: string | null;
  parentName: string | null;
  budgeted: number;
  actual: number;
  difference: number;
  isParent: boolean;
};

export type BudgetGroup = {
  type: string;
  label: string;
  items: BudgetLineItem[];
  totalBudgeted: number;
  totalActual: number;
  totalDifference: number;
};

export async function getBudgetVsActual(year: number, month: number) {
  const session = await auth();
  if (!session?.user) return [];

  // Fetch all active categories
  const categories = await prisma.category.findMany({
    where: { active: true },
    include: { parent: true, children: { where: { active: true } } },
    orderBy: { sort: "asc" },
  });

  // Fetch master budgets for the year
  const masterBudgets = await prisma.masterBudget.findMany({
    where: { year },
  });
  const masterMap = new Map(
    masterBudgets.map((mb) => [mb.categoryId, mb.amount])
  );

  // Fetch monthly overrides
  const monthlyBudgets = await prisma.budget.findMany({
    where: { year, month },
  });
  const overrideMap = new Map(
    monthlyBudgets.map((b) => [b.categoryId, b.amount])
  );

  // Fetch actual spending grouped by category for the month
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const expenseAgg = await prisma.expense.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: {
      date: { gte: monthStart, lte: monthEnd },
    },
  });
  const actualMap = new Map(
    expenseAgg.map((e) => [e.categoryId, e._sum.amount || 0])
  );

  const typeLabels: Record<string, string> = {
    income: "Income",
    fixed: "Fixed Expenses",
    variable: "Variable Expenses",
    tax: "Taxes",
    savings: "Savings",
  };

  const typeOrder = ["income", "fixed", "variable", "tax", "savings"];

  // Build line items — skip parent categories (they'll be summed from children)
  const lineItems: BudgetLineItem[] = [];

  for (const cat of categories) {
    const isParent = cat.children.length > 0;
    if (isParent) continue; // skip parents, we'll aggregate below

    const override = overrideMap.get(cat.id);
    const master = masterMap.get(cat.id);
    const budgeted =
      override !== undefined ? override : master !== undefined ? master / 12 : 0;
    const actual = actualMap.get(cat.id) || 0;

    lineItems.push({
      categoryId: cat.id,
      categoryName: cat.parent
        ? `${cat.parent.name} > ${cat.name}`
        : cat.name,
      type: cat.type,
      parentId: cat.parentId,
      parentName: cat.parent?.name || null,
      budgeted: Math.round(budgeted * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      difference: Math.round((budgeted - actual) * 100) / 100,
      isParent: false,
    });
  }

  // Group by type
  const groups: BudgetGroup[] = [];

  for (const type of typeOrder) {
    const items = lineItems.filter((li) => li.type === type);
    if (items.length === 0) continue;

    const totalBudgeted = items.reduce((sum, i) => sum + i.budgeted, 0);
    const totalActual = items.reduce((sum, i) => sum + i.actual, 0);

    groups.push({
      type,
      label: typeLabels[type] || type,
      items,
      totalBudgeted: Math.round(totalBudgeted * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      totalDifference: Math.round((totalBudgeted - totalActual) * 100) / 100,
    });
  }

  return groups;
}
