"use server";

import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const recurringSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  frequency: z.enum(["monthly", "weekly", "yearly"]),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
});

export async function getRecurringExpenses() {
  const session = await auth();
  if (!session?.user) return [];

  return prisma.recurringExpense.findMany({
    where: { active: true },
    include: { category: { include: { parent: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createRecurringExpense(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = recurringSchema.safeParse({
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    description: formData.get("description"),
    frequency: formData.get("frequency"),
    dayOfMonth: formData.get("dayOfMonth") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.recurringExpense.create({
    data: {
      amount: parsed.data.amount,
      categoryId: parsed.data.categoryId,
      description: parsed.data.description || null,
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.frequency === "monthly" ? (parsed.data.dayOfMonth ?? 1) : null,
    },
  });

  revalidatePath("/dashboard/expenses/recurring");
  return { success: true };
}

export async function deleteRecurringExpense(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  await prisma.recurringExpense.delete({ where: { id } });

  revalidatePath("/dashboard/expenses/recurring");
  return { success: true };
}

export async function applyRecurringExpenses(): Promise<{
  error?: string;
  applied?: number;
}> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const now = new Date();
  const recurring = await prisma.recurringExpense.findMany({
    where: { active: true },
  });

  let applied = 0;

  for (const rec of recurring) {
    // Check if already applied this period
    const lastApplied = rec.lastApplied;
    let shouldApply = false;

    if (!lastApplied) {
      shouldApply = true;
    } else if (rec.frequency === "monthly") {
      shouldApply =
        lastApplied.getFullYear() < now.getFullYear() ||
        lastApplied.getMonth() < now.getMonth();
    } else if (rec.frequency === "weekly") {
      const diffDays = (now.getTime() - lastApplied.getTime()) / (1000 * 60 * 60 * 24);
      shouldApply = diffDays >= 7;
    } else if (rec.frequency === "yearly") {
      shouldApply = lastApplied.getFullYear() < now.getFullYear();
    }

    if (shouldApply) {
      const expenseDate =
        rec.frequency === "monthly" && rec.dayOfMonth
          ? new Date(now.getFullYear(), now.getMonth(), Math.min(rec.dayOfMonth, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()))
          : now;

      await prisma.expense.create({
        data: {
          amount: rec.amount,
          categoryId: rec.categoryId,
          date: expenseDate,
          description: rec.description ? `${rec.description} (recurring)` : "Recurring expense",
          source: "manual",
        },
      });

      await prisma.recurringExpense.update({
        where: { id: rec.id },
        data: { lastApplied: now },
      });

      applied++;
    }
  }

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
  return { applied };
}
