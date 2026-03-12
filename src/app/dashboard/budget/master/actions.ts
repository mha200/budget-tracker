"use server";

import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export type MasterBudgetRow = {
  categoryId: string;
  categoryName: string;
  type: string;
  parentId: string | null;
  parentName: string | null;
  isParent: boolean;
  sort: number;
  annualAmount: number;
};

export async function getMasterBudget(year: number) {
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

  const rows: MasterBudgetRow[] = categories.map((cat) => ({
    categoryId: cat.id,
    categoryName: cat.name,
    type: cat.type,
    parentId: cat.parentId,
    parentName: cat.parent?.name || null,
    isParent: cat.children.length > 0,
    sort: cat.sort,
    annualAmount: cat.masterBudgets[0]?.amount ?? 0,
  }));

  return rows;
}

const updateBudgetSchema = z.object({
  categoryId: z.string().min(1),
  year: z.coerce.number().int().min(2020).max(2100),
  amount: z.coerce.number().min(0, "Amount must be 0 or more"),
});

export async function updateMasterBudget(
  categoryId: string,
  year: number,
  amount: number
): Promise<{ error?: string; success?: boolean }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = updateBudgetSchema.safeParse({ categoryId, year, amount });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.masterBudget.upsert({
    where: { categoryId_year: { categoryId, year } },
    update: { amount },
    create: { categoryId, year, amount },
  });

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
  parentId?: string
): Promise<{ error?: string; success?: boolean; categoryId?: string }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = addCategorySchema.safeParse({ name, type, parentId });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Get the max sort value to place at the end
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

  revalidatePath("/dashboard/budget");
  return { success: true, categoryId: cat.id };
}
