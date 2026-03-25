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
  rollover: number;
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

  // Fetch all monthly overrides for the year (for rollover calculation)
  const allMonthlyBudgets = await prisma.budget.findMany({
    where: { year },
  });
  const overrideByMonthMap = new Map<string, number>();
  for (const b of allMonthlyBudgets) {
    overrideByMonthMap.set(`${b.categoryId}-${b.month}`, b.amount);
  }

  // Fetch actual spending for the current month
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

  // Fetch spending from prior months this year (Jan through month-1) for rollover
  const yearStart = new Date(year, 0, 1);
  const priorMonthEnd = new Date(year, month - 1, 0, 23, 59, 59); // last day of prior month

  let priorSpendingMap = new Map<string, number>();
  if (month > 1) {
    const priorAgg = await prisma.expense.groupBy({
      by: ["categoryId"],
      _sum: { amount: true },
      where: {
        date: { gte: yearStart, lte: priorMonthEnd },
      },
    });
    priorSpendingMap = new Map(
      priorAgg.map((e) => [e.categoryId, e._sum.amount || 0])
    );
  }

  const typeLabels: Record<string, string> = {
    income: "Income",
    fixed: "Fixed Expenses",
    variable: "Variable Expenses",
    tax: "Taxes",
    savings: "Savings",
  };

  const typeOrder = ["income", "fixed", "variable", "tax", "savings"];

  // Build leaf items
  const leafItems: BudgetLineItem[] = [];

  for (const cat of categories) {
    const isParent = cat.children.length > 0;
    if (isParent) continue;

    const override = overrideMap.get(cat.id);
    const master = masterMap.get(cat.id);
    const monthlyRate =
      override !== undefined ? override : master !== undefined ? master / 12 : 0;

    // Calculate rollover: cumulative budget for prior months minus cumulative spending
    let rollover = 0;
    if (month > 1 && monthlyRate > 0) {
      let cumulativePriorBudget = 0;
      for (let m = 1; m < month; m++) {
        const mOverride = overrideByMonthMap.get(`${cat.id}-${m}`);
        cumulativePriorBudget += mOverride !== undefined ? mOverride : (master !== undefined ? master / 12 : 0);
      }
      const priorSpending = priorSpendingMap.get(cat.id) || 0;
      rollover = cumulativePriorBudget - priorSpending;
    }

    const budgeted = monthlyRate + rollover;
    const actual = actualMap.get(cat.id) || 0;

    leafItems.push({
      categoryId: cat.id,
      categoryName: cat.name,
      type: cat.type,
      parentId: cat.parentId,
      parentName: cat.parent?.name || null,
      budgeted: Math.round(budgeted * 100) / 100,
      rollover: Math.round(rollover * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      difference: Math.round((budgeted - actual) * 100) / 100,
      isParent: false,
    });
  }

  // Group by type, inserting parent summary rows
  const groups: BudgetGroup[] = [];

  for (const type of typeOrder) {
    const typeLeafs = leafItems.filter((li) => li.type === type);
    if (typeLeafs.length === 0) continue;

    // Find parent categories for this type
    const parentCats = categories.filter(
      (c) => c.type === type && c.children.length > 0
    );

    // Build ordered items: parent row then its children, then top-level leafs
    const orderedItems: BudgetLineItem[] = [];

    for (const parent of parentCats) {
      const children = typeLeafs.filter((li) => li.parentId === parent.id);
      if (children.length === 0) continue;

      const parentBudgeted = children.reduce((s, c) => s + c.budgeted, 0);
      const parentRollover = children.reduce((s, c) => s + c.rollover, 0);
      const parentActual = children.reduce((s, c) => s + c.actual, 0);

      orderedItems.push({
        categoryId: parent.id,
        categoryName: parent.name,
        type: parent.type,
        parentId: null,
        parentName: null,
        budgeted: Math.round(parentBudgeted * 100) / 100,
        rollover: Math.round(parentRollover * 100) / 100,
        actual: Math.round(parentActual * 100) / 100,
        difference: Math.round((parentBudgeted - parentActual) * 100) / 100,
        isParent: true,
      });

      orderedItems.push(...children);
    }

    // Add top-level leafs (no parent)
    const topLevel = typeLeafs.filter((li) => !li.parentId);
    orderedItems.push(...topLevel);

    const totalBudgeted = typeLeafs.reduce((sum, i) => sum + i.budgeted, 0);
    const totalActual = typeLeafs.reduce((sum, i) => sum + i.actual, 0);

    groups.push({
      type,
      label: typeLabels[type] || type,
      items: orderedItems,
      totalBudgeted: Math.round(totalBudgeted * 100) / 100,
      totalActual: Math.round(totalActual * 100) / 100,
      totalDifference: Math.round((totalBudgeted - totalActual) * 100) / 100,
    });
  }

  return groups;
}
