"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export type MonthlyTrend = {
  month: string;
  total: number;
};

export type CategoryBreakdown = {
  name: string;
  amount: number;
};

export type BudgetVsActualBar = {
  id: string;
  category: string;
  type: string;
  budgeted: number;
  actual: number;
  isParent: boolean;
  parentId: string | null;
  children?: BudgetVsActualBar[];
};

export async function getMonthlyTrend(year: number) {
  const session = await auth();
  if (!session?.user) return [];

  const months: MonthlyTrend[] = [];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  for (let m = 0; m < 12; m++) {
    const start = new Date(year, m, 1);
    const end = new Date(year, m + 1, 0, 23, 59, 59);

    const agg = await prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        date: { gte: start, lte: end },
        category: { type: { not: "income" } },
      },
    });

    months.push({
      month: monthNames[m],
      total: Math.round((agg._sum.amount || 0) * 100) / 100,
    });
  }

  return months;
}

export async function getCategoryBreakdown(year: number, month: number) {
  const session = await auth();
  if (!session?.user) return [];

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const expenses = await prisma.expense.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: {
      date: { gte: start, lte: end },
      category: { type: { not: "income" } },
    },
  });

  const categories = await prisma.category.findMany({
    where: { active: true },
    include: { parent: true },
  });
  const catMap = new Map(categories.map((c) => [c.id, c]));

  const breakdown: CategoryBreakdown[] = expenses
    .filter((e) => (e._sum.amount || 0) > 0)
    .map((e) => {
      const cat = catMap.get(e.categoryId);
      const name = cat
        ? cat.parent
          ? `${cat.parent.name} > ${cat.name}`
          : cat.name
        : "Unknown";
      return { name, amount: Math.round((e._sum.amount || 0) * 100) / 100 };
    })
    .sort((a, b) => b.amount - a.amount);

  return breakdown;
}

export async function getSpendingByType(year: number, month: number) {
  const session = await auth();
  if (!session?.user) return [];

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
    include: { category: true },
  });

  const typeLabels: Record<string, string> = {
    fixed: "Fixed",
    variable: "Variable",
    tax: "Taxes",
    savings: "Savings",
  };

  const totals = new Map<string, number>();
  for (const exp of expenses) {
    if (exp.category.type === "income") continue;
    const label = typeLabels[exp.category.type] || exp.category.type;
    totals.set(label, (totals.get(label) || 0) + exp.amount);
  }

  return Array.from(totals.entries())
    .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
    .sort((a, b) => b.amount - a.amount);
}

export async function getBudgetVsActualChart(year: number, month: number) {
  const session = await auth();
  if (!session?.user) return [];

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const categories = await prisma.category.findMany({
    where: { active: true },
    include: {
      parent: true,
      children: { where: { active: true } },
      masterBudgets: { where: { year } },
    },
    orderBy: { sort: "asc" },
  });

  const overrides = await prisma.budget.findMany({ where: { year, month } });
  const overrideMap = new Map(overrides.map((b) => [b.categoryId, b.amount]));

  const expenseAgg = await prisma.expense.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: { date: { gte: start, lte: end } },
  });
  const actualMap = new Map(
    expenseAgg.map((e) => [e.categoryId, e._sum.amount || 0])
  );

  // Build leaf items keyed by id
  const leafMap = new Map<string, BudgetVsActualBar>();

  for (const cat of categories) {
    if (cat.children.length > 0) continue;
    if (cat.type === "income") continue;

    const override = overrideMap.get(cat.id);
    const master = cat.masterBudgets[0]?.amount;
    const budgeted =
      override !== undefined ? override : master !== undefined ? master / 12 : 0;
    const actual = actualMap.get(cat.id) || 0;

    if (budgeted === 0 && actual === 0) continue;

    leafMap.set(cat.id, {
      id: cat.id,
      category: cat.name,
      type: cat.type,
      budgeted: Math.round(budgeted * 100) / 100,
      actual: Math.round(actual * 100) / 100,
      isParent: false,
      parentId: cat.parentId,
    });
  }

  // Build top-level list: parent summaries + standalone leafs
  const result: BudgetVsActualBar[] = [];
  const usedLeafIds = new Set<string>();

  for (const cat of categories) {
    if (cat.type === "income") continue;
    if (cat.children.length === 0) continue; // not a parent

    const children: BudgetVsActualBar[] = [];
    for (const child of cat.children) {
      const leaf = leafMap.get(child.id);
      if (leaf) {
        children.push(leaf);
        usedLeafIds.add(child.id);
      }
    }

    if (children.length === 0) continue;

    const parentBudgeted = children.reduce((s, c) => s + c.budgeted, 0);
    const parentActual = children.reduce((s, c) => s + c.actual, 0);

    result.push({
      id: cat.id,
      category: cat.name,
      type: cat.type,
      budgeted: Math.round(parentBudgeted * 100) / 100,
      actual: Math.round(parentActual * 100) / 100,
      isParent: true,
      parentId: null,
      children,
    });
  }

  // Add standalone leafs (no parent)
  for (const [id, leaf] of leafMap) {
    if (!usedLeafIds.has(id)) {
      result.push(leaf);
    }
  }

  return result;
}
