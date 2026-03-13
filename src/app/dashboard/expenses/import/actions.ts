"use server";

import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { categorizeDescription } from "@/lib/categorize";

export async function categorizeRows(
  descriptions: string[]
): Promise<{ categoryIds: (string | null)[] }> {
  const session = await auth();
  if (!session?.user) return { categoryIds: descriptions.map(() => null) };

  const rules = await prisma.categorizationRule.findMany();

  const categoryIds = descriptions.map((desc) =>
    categorizeDescription(desc, rules)
  );

  return { categoryIds };
}

const commitRowSchema = z.object({
  date: z.coerce.date(),
  description: z.string(),
  amount: z.coerce.number().positive(),
  categoryId: z.string().min(1),
});

const commitSchema = z.object({
  filename: z.string().min(1),
  totalParsed: z.number().int().min(1),
  rows: z.array(commitRowSchema).min(1),
});

export async function commitImport(data: {
  filename: string;
  totalParsed: number;
  rows: { date: string; description: string; amount: number; categoryId: string }[];
}): Promise<{ error?: string; success?: boolean; committed?: number }> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated" };

  const parsed = commitSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { filename, totalParsed, rows } = parsed.data;

  // Verify all category IDs exist
  const categoryIds = [...new Set(rows.map((r) => r.categoryId))];
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true },
  });
  const validIds = new Set(categories.map((c) => c.id));
  const invalid = categoryIds.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    return { error: `Invalid category ID(s): ${invalid.join(", ")}` };
  }

  // Create statement and expenses in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const statement = await tx.uploadedStatement.create({
      data: {
        filename,
        fileType: "csv",
        status: "committed",
        parsedRows: totalParsed,
        committedRows: rows.length,
      },
    });

    for (const row of rows) {
      await tx.expense.create({
        data: {
          amount: row.amount,
          categoryId: row.categoryId,
          date: row.date,
          description: row.description,
          source: "csv",
          statementId: statement.id,
          reviewed: false,
        },
      });
    }

    return { committed: rows.length };
  });

  revalidatePath("/dashboard/expenses");
  revalidatePath("/dashboard");
  return { success: true, committed: result.committed };
}
