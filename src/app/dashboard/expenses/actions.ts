"use server";

import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

const expenseSchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.coerce.date(),
  description: z.string().optional(),
});

export async function createExpense(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Not authenticated" };
  }

  const parsed = expenseSchema.safeParse({
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    date: formData.get("date"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { amount, categoryId, date, description } = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    return { error: "Invalid category" };
  }

  await prisma.expense.create({
    data: {
      amount,
      categoryId,
      date,
      description: description || null,
      source: "manual",
    },
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getCategories() {
  const categories = await prisma.category.findMany({
    where: { active: true },
    include: { parent: true },
    orderBy: { sort: "asc" },
  });

  return categories;
}

export async function getExpenses(filters?: {
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
}) {
  const session = await auth();
  if (!session?.user) return [];

  const where: Record<string, unknown> = {};

  if (filters?.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters?.dateFrom || filters?.dateTo) {
    where.date = {};
    if (filters.dateFrom) {
      (where.date as Record<string, unknown>).gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      (where.date as Record<string, unknown>).lte = new Date(
        filters.dateTo + "T23:59:59"
      );
    }
  }

  if (filters?.source) {
    where.source = filters.source;
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: {
        include: { parent: true },
      },
    },
    orderBy: { date: "desc" },
  });

  return expenses;
}

export async function updateExpense(
  id: string,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = expenseSchema.safeParse({
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    date: formData.get("date"),
    description: formData.get("description"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { amount, categoryId, date, description } = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category) return { error: "Invalid category" };

  await prisma.expense.update({
    where: { id },
    data: { amount, categoryId, date, description: description || null },
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function searchPastTransactions(query: string) {
  const session = await auth();
  if (!session?.user) return [];

  if (!query || query.length < 2) return [];

  const expenses = await prisma.expense.findMany({
    where: {
      description: { contains: query, mode: "insensitive" },
    },
    include: {
      category: { include: { parent: true } },
    },
    orderBy: { date: "desc" },
  });

  // Deduplicate by description+category, keeping the most recent
  const seen = new Map<string, (typeof expenses)[0]>();
  for (const exp of expenses) {
    const key = `${exp.description?.toLowerCase()}::${exp.categoryId}`;
    if (!seen.has(key)) {
      seen.set(key, exp);
    }
  }

  return Array.from(seen.values())
    .slice(0, 5)
    .map((exp) => ({
      description: exp.description,
      amount: exp.amount,
      categoryId: exp.categoryId,
      categoryLabel: exp.category.parent
        ? `${exp.category.parent.name} > ${exp.category.name}`
        : exp.category.name,
    }));
}

export async function deleteExpense(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Not authenticated" };
  }

  await prisma.expense.delete({ where: { id } });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}
