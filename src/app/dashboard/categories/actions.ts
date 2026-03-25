"use server";

import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export type CategoryRow = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  parentName: string | null;
  isParent: boolean;
  sort: number;
  active: boolean;
  budgetAmount: number; // annual
  budgetYear: number | null;
};

export async function getCategories(year: number): Promise<CategoryRow[]> {
  const session = await auth();
  if (!session?.user) return [];

  const categories = await prisma.category.findMany({
    where: { active: true },
    include: {
      parent: true,
      children: { where: { active: true } },
      masterBudgets: { where: { year } },
    },
    orderBy: { sort: "asc" },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    type: cat.type,
    parentId: cat.parentId,
    parentName: cat.parent?.name || null,
    isParent: cat.children.length > 0,
    sort: cat.sort,
    active: cat.active,
    budgetAmount: cat.masterBudgets[0]?.amount ?? 0,
    budgetYear: cat.masterBudgets[0] ? year : null,
  }));
}

const updateCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "fixed", "variable", "tax", "savings"]),
  parentId: z.string().optional(),
});

export async function updateCategory(
  id: string,
  name: string,
  type: string,
  parentId?: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = updateCategorySchema.safeParse({ name, type, parentId });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Prevent setting a category as its own parent
  if (parentId === id) return { error: "A category cannot be its own parent" };

  // Prevent setting a child as parent (circular reference)
  if (parentId) {
    const children = await prisma.category.findMany({
      where: { parentId: id, active: true },
    });
    if (children.some((c) => c.id === parentId)) {
      return { error: "Cannot set a child category as the parent" };
    }
  }

  await prisma.category.update({
    where: { id },
    data: {
      name,
      type,
      parentId: parentId || null,
    },
  });

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/budget");
  return { success: true };
}

const addCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["income", "fixed", "variable", "tax", "savings"]),
  parentId: z.string().optional(),
});

export async function addCategory(
  name: string,
  type: string,
  parentId?: string,
  monthlyAmount?: number,
  year?: number
): Promise<{ error?: string; success?: boolean; categoryId?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = addCategorySchema.safeParse({ name, type, parentId });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const maxSort = await prisma.category.aggregate({ _max: { sort: true } });
  const sort = (maxSort._max.sort ?? 0) + 5;

  const cat = await prisma.category.create({
    data: {
      name,
      type,
      parentId: parentId || null,
      sort,
    },
  });

  if (monthlyAmount && monthlyAmount > 0 && year) {
    const annualAmount = Math.round(monthlyAmount * 12 * 100) / 100;
    await prisma.masterBudget.create({
      data: { categoryId: cat.id, year, amount: annualAmount },
    });
  }

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/budget");
  return { success: true, categoryId: cat.id };
}

export async function deleteCategory(
  categoryId: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const expenseCount = await prisma.expense.count({ where: { categoryId } });
  if (expenseCount > 0) {
    return {
      error: `Cannot delete: ${expenseCount} transaction${expenseCount !== 1 ? "s" : ""} linked to this category. Delete or reassign them first.`,
    };
  }

  const childCount = await prisma.category.count({
    where: { parentId: categoryId, active: true },
  });
  if (childCount > 0) {
    return { error: "Cannot delete: this category has subcategories. Delete them first." };
  }

  await prisma.masterBudget.deleteMany({ where: { categoryId } });
  await prisma.budget.deleteMany({ where: { categoryId } });
  await prisma.categorizationRule.deleteMany({ where: { categoryId } });
  await prisma.category.delete({ where: { id: categoryId } });

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/budget");
  return { success: true };
}

export async function setBudgetAmount(
  categoryId: string,
  year: number,
  monthlyAmount: number
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const annualAmount = Math.round(monthlyAmount * 12 * 100) / 100;

  await prisma.masterBudget.upsert({
    where: { categoryId_year: { categoryId, year } },
    update: { amount: annualAmount },
    create: { categoryId, year, amount: annualAmount },
  });

  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/budget");
  return { success: true };
}
