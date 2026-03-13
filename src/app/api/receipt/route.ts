import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Receipt scanning is not configured. Please add ANTHROPIC_API_KEY to your environment." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("receipt") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Please upload a JPEG, PNG, WebP, or GIF image" },
      { status: 400 }
    );
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image must be under 10MB" },
      { status: 400 }
    );
  }

  // Convert to base64
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

  // Fetch categories for matching
  const categories = await prisma.category.findMany({
    where: { active: true },
    include: { parent: true },
  });

  const categorizationRules = await prisma.categorizationRule.findMany({
    include: { category: true },
    orderBy: { priority: "desc" },
  });

  const categoryList = categories
    .filter((c) => !categories.some((other) => other.parentId === c.id))
    .map((c) => ({
      id: c.id,
      label: c.parent ? `${c.parent.name} > ${c.name}` : c.name,
      type: c.type,
    }));

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Extract the receipt details from this image. Return a JSON object with these fields:
- "merchant": the store/business name
- "amount": the total amount as a number (no currency symbol)
- "date": the date in YYYY-MM-DD format (use today's date if not visible)
- "items": brief summary of items purchased (one line)

If you cannot read the receipt clearly, set "error" to a description of the problem.

Return ONLY valid JSON, no other text.`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "Could not process receipt" }, { status: 500 });
    }

    let extracted;
    try {
      // Strip markdown code fences if present
      const jsonText = textBlock.text.replace(/```json\s*|\s*```/g, "").trim();
      extracted = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "Could not parse receipt data. Please try a clearer photo." },
        { status: 422 }
      );
    }

    if (extracted.error) {
      return NextResponse.json({ error: extracted.error }, { status: 422 });
    }

    // Try to auto-match category using categorization rules
    let matchedCategoryId: string | null = null;
    const merchantLower = (extracted.merchant || "").toLowerCase();
    const itemsLower = (extracted.items || "").toLowerCase();
    const searchText = `${merchantLower} ${itemsLower}`;

    for (const rule of categorizationRules) {
      if (searchText.includes(rule.keyword.toLowerCase())) {
        matchedCategoryId = rule.categoryId;
        break;
      }
    }

    return NextResponse.json({
      merchant: extracted.merchant || "",
      amount: Number(extracted.amount) || 0,
      date: extracted.date || new Date().toISOString().split("T")[0],
      items: extracted.items || "",
      suggestedCategoryId: matchedCategoryId,
      categories: categoryList,
    });
  } catch (err) {
    console.error("Receipt scan error:", err);
    return NextResponse.json(
      { error: "Failed to process receipt. Please try again." },
      { status: 500 }
    );
  }
}
