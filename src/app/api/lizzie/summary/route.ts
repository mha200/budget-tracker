import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rollover only considers months from this date onward
const ROLLOVER_START_YEAR = 2026;
const ROLLOVER_START_MONTH = 3; // March

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token !== process.env.LIZZIE_API_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  const rolloverFirstMonth = year === ROLLOVER_START_YEAR ? ROLLOVER_START_MONTH : (year > ROLLOVER_START_YEAR ? 1 : month);
  const rolloverStart = new Date(year, rolloverFirstMonth - 1, 1);
  const priorMonthEnd = new Date(year, month - 1, 0, 23, 59, 59);

  // Fetch categories
  const categories = await prisma.category.findMany({
    where: { active: true },
    include: { children: { where: { active: true } } },
  });
  const leafCategories = categories.filter((c) => c.children.length === 0);

  // Fetch master budgets for the year
  const masterBudgets = await prisma.masterBudget.findMany({ where: { year } });
  const masterMap = new Map(masterBudgets.map((mb) => [mb.categoryId, mb.amount]));

  // Fetch all monthly overrides for the year
  const allOverrides = await prisma.budget.findMany({ where: { year } });
  const overrideMap = new Map<string, number>();
  for (const b of allOverrides) {
    overrideMap.set(`${b.categoryId}-${b.month}`, b.amount);
  }

  // Current month spending by category
  const currentExpenses = await prisma.expense.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: { date: { gte: startOfMonth, lte: endOfMonth } },
  });
  const currentSpendMap = new Map(
    currentExpenses.map((e) => [e.categoryId, e._sum.amount || 0])
  );

  // Prior months spending for rollover
  let priorSpendMap = new Map<string, number>();
  if (month > rolloverFirstMonth) {
    const priorExpenses = await prisma.expense.groupBy({
      by: ["categoryId"],
      _sum: { amount: true },
      where: { date: { gte: rolloverStart, lte: priorMonthEnd } },
    });
    priorSpendMap = new Map(
      priorExpenses.map((e) => [e.categoryId, e._sum.amount || 0])
    );
  }

  // Build summary with rollover
  const summary = leafCategories.map((cat) => {
    const master = masterMap.get(cat.id);
    const currentOverride = overrideMap.get(`${cat.id}-${month}`);
    const monthlyRate = currentOverride !== undefined ? currentOverride : (master !== undefined ? master / 12 : 0);

    let rollover = 0;
    const firstRolloverMonth = year === ROLLOVER_START_YEAR ? ROLLOVER_START_MONTH : (year > ROLLOVER_START_YEAR ? 1 : month);
    if (month > firstRolloverMonth && monthlyRate > 0) {
      let cumulativePriorBudget = 0;
      for (let m = firstRolloverMonth; m < month; m++) {
        const mOverride = overrideMap.get(`${cat.id}-${m}`);
        cumulativePriorBudget += mOverride !== undefined ? mOverride : (master !== undefined ? master / 12 : 0);
      }
      rollover = cumulativePriorBudget - (priorSpendMap.get(cat.id) || 0);
    }

    const effectiveBudget = Math.round((monthlyRate + rollover) * 100) / 100;
    const spent = Math.round((currentSpendMap.get(cat.id) || 0) * 100) / 100;

    return {
      category: cat.name,
      monthlyBudget: Math.round(monthlyRate * 100) / 100,
      rollover: Math.round(rollover * 100) / 100,
      effectiveBudget,
      spent,
      remaining: Math.round((effectiveBudget - spent) * 100) / 100,
      overBudget: spent > effectiveBudget,
    };
  }).filter((s) => s.effectiveBudget > 0 || s.spent > 0);

  const overBudget = summary.filter((s) => s.overBudget);
  const totalSpent = summary.reduce((sum, s) => sum + s.spent, 0);

  return NextResponse.json({
    month: `${year}-${String(month).padStart(2, "0")}`,
    totalSpent,
    overBudgetCategories: overBudget,
    summary,
  });
}
