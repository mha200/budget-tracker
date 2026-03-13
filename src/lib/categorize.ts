export type Rule = {
  keyword: string;
  categoryId: string;
  priority: number;
};

export function categorizeDescription(
  description: string,
  rules: Rule[]
): string | null {
  const lower = description.toLowerCase();
  let bestMatch: Rule | null = null;

  for (const rule of rules) {
    if (lower.includes(rule.keyword.toLowerCase())) {
      if (!bestMatch || rule.priority > bestMatch.priority) {
        bestMatch = rule;
      }
    }
  }

  return bestMatch?.categoryId ?? null;
}
