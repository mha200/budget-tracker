import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing seed data (order matters for FK constraints)
  await prisma.categorizationRule.deleteMany();
  await prisma.masterBudget.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.category.deleteMany();

  // ─── Income ──────────────────────────────────────────────
  const income = await prisma.category.create({
    data: { name: "Income", type: "income", sort: 0 },
  });
  await prisma.masterBudget.create({
    data: { categoryId: income.id, year: 2026, amount: 14000 },
  });

  // ─── Fixed Expenses ──────────────────────────────────────

  // Housing (parent)
  const housing = await prisma.category.create({
    data: { name: "Housing", type: "fixed", sort: 10 },
  });
  const fixedSubs: { name: string; amount: number; parent: string; sort: number }[] = [
    { name: "Rent", amount: 465.29, parent: "housing", sort: 11 },
    { name: "Property Tax", amount: 181.83, parent: "housing", sort: 12 },
    { name: "Home Insurance", amount: 240, parent: "housing", sort: 13 },
    { name: "HOA", amount: 175, parent: "housing", sort: 14 },
    { name: "Yard Care", amount: 125, parent: "housing", sort: 15 },
    { name: "Home Maintenance", amount: 200, parent: "housing", sort: 16 },
  ];

  const categoryMap: Record<string, string> = {};
  categoryMap["housing"] = housing.id;

  for (const sub of fixedSubs) {
    const cat = await prisma.category.create({
      data: {
        name: sub.name,
        type: "fixed",
        parentId: categoryMap[sub.parent],
        sort: sub.sort,
      },
    });
    await prisma.masterBudget.create({
      data: { categoryId: cat.id, year: 2026, amount: sub.amount },
    });
    categoryMap[sub.name.toLowerCase().replace(/ /g, "_")] = cat.id;
  }

  // Healthcare
  const healthcare = await prisma.category.create({
    data: { name: "Healthcare", type: "fixed", sort: 20 },
  });
  await prisma.masterBudget.create({
    data: { categoryId: healthcare.id, year: 2026, amount: 939 },
  });

  // Aunt's Care
  const auntsCare = await prisma.category.create({
    data: { name: "Aunt's Care", type: "fixed", sort: 25 },
  });
  await prisma.masterBudget.create({
    data: { categoryId: auntsCare.id, year: 2026, amount: 300 },
  });

  // Car Payment
  const carPayment = await prisma.category.create({
    data: { name: "Car Payment", type: "fixed", sort: 30 },
  });
  await prisma.masterBudget.create({
    data: { categoryId: carPayment.id, year: 2026, amount: 674 },
  });

  // Car (parent)
  const car = await prisma.category.create({
    data: { name: "Car", type: "fixed", sort: 35 },
  });
  categoryMap["car"] = car.id;

  const carSubs = [
    { name: "Car Insurance", amount: 84.58, sort: 36 },
    { name: "Gas", amount: 125, sort: 37 },
    { name: "Car Maintenance", amount: 125, sort: 38 },
  ];
  for (const sub of carSubs) {
    const cat = await prisma.category.create({
      data: { name: sub.name, type: "fixed", parentId: car.id, sort: sub.sort },
    });
    await prisma.masterBudget.create({
      data: { categoryId: cat.id, year: 2026, amount: sub.amount },
    });
    categoryMap[sub.name.toLowerCase().replace(/ /g, "_")] = cat.id;
  }

  // Subscriptions
  const subscriptions = await prisma.category.create({
    data: { name: "Subscriptions", type: "fixed", sort: 40 },
  });
  await prisma.masterBudget.create({
    data: { categoryId: subscriptions.id, year: 2026, amount: 300 },
  });
  categoryMap["subscriptions"] = subscriptions.id;

  // WiFi/Phone
  const wifiPhone = await prisma.category.create({
    data: { name: "WiFi/Phone", type: "fixed", sort: 45 },
  });
  await prisma.masterBudget.create({
    data: { categoryId: wifiPhone.id, year: 2026, amount: 225 },
  });

  // ─── Variable Expenses ───────────────────────────────────

  const variableLeafs = [
    { name: "Groceries", amount: 600, sort: 50 },
    { name: "Dining Out", amount: 300, sort: 55 },
  ];
  for (const item of variableLeafs) {
    const cat = await prisma.category.create({
      data: { name: item.name, type: "variable", sort: item.sort },
    });
    await prisma.masterBudget.create({
      data: { categoryId: cat.id, year: 2026, amount: item.amount },
    });
    categoryMap[item.name.toLowerCase().replace(/ /g, "_")] = cat.id;
  }

  // Travel (parent)
  const travel = await prisma.category.create({
    data: { name: "Travel", type: "variable", sort: 60 },
  });
  categoryMap["travel"] = travel.id;

  const travelSubs = [
    { name: "Airfare", amount: 800, sort: 61 },
    { name: "Lodging", amount: 900, sort: 62 },
    { name: "Transport", amount: 300, sort: 63 },
    { name: "Meals", amount: 500, sort: 64 },
    { name: "Adventures", amount: 500, sort: 65 },
  ];
  for (const sub of travelSubs) {
    const cat = await prisma.category.create({
      data: { name: sub.name, type: "variable", parentId: travel.id, sort: sub.sort },
    });
    await prisma.masterBudget.create({
      data: { categoryId: cat.id, year: 2026, amount: sub.amount },
    });
    categoryMap[sub.name.toLowerCase().replace(/ /g, "_")] = cat.id;
  }

  const moreVariable = [
    { name: "Clothing", amount: 250, sort: 70 },
    { name: "Health and Wellness", amount: 300, sort: 75 },
    { name: "Entertainment", amount: 125, sort: 80 },
    { name: "Personal Care", amount: 300, sort: 85 },
    { name: "Education", amount: 600, sort: 90 },
    { name: "Gifts", amount: 150, sort: 95 },
    { name: "Professional Services", amount: 150, sort: 100 },
  ];
  for (const item of moreVariable) {
    const cat = await prisma.category.create({
      data: { name: item.name, type: "variable", sort: item.sort },
    });
    await prisma.masterBudget.create({
      data: { categoryId: cat.id, year: 2026, amount: item.amount },
    });
    categoryMap[item.name.toLowerCase().replace(/ /g, "_")] = cat.id;
  }

  // ─── Taxes ───────────────────────────────────────────────

  const taxes = await prisma.category.create({
    data: { name: "Taxes", type: "tax", sort: 110 },
  });
  await prisma.masterBudget.create({
    data: { categoryId: taxes.id, year: 2026, amount: 3450 },
  });

  // ─── Savings ─────────────────────────────────────────────

  const savings = await prisma.category.create({
    data: { name: "Savings", type: "savings", sort: 120 },
  });
  await prisma.masterBudget.create({
    data: { categoryId: savings.id, year: 2026, amount: 651.13 },
  });

  // ─── Categorization Rules ────────────────────────────────

  const rules = [
    { keyword: "Whole Foods", category: "groceries", priority: 10 },
    { keyword: "Trader Joe's", category: "groceries", priority: 10 },
    { keyword: "Costco", category: "groceries", priority: 5 },
    { keyword: "DoorDash", category: "dining_out", priority: 10 },
    { keyword: "Uber Eats", category: "dining_out", priority: 10 },
    { keyword: "Airbnb", category: "lodging", priority: 10 },
    { keyword: "Hilton", category: "lodging", priority: 10 },
    { keyword: "Marriott", category: "lodging", priority: 10 },
    { keyword: "Shell", category: "gas", priority: 10 },
    { keyword: "Chevron", category: "gas", priority: 10 },
    { keyword: "Netflix", category: "subscriptions", priority: 10 },
    { keyword: "Spotify", category: "subscriptions", priority: 10 },
    { keyword: "Hulu", category: "subscriptions", priority: 10 },
    { keyword: "United Airlines", category: "airfare", priority: 10 },
    { keyword: "Delta", category: "airfare", priority: 10 },
    { keyword: "CVS", category: "personal_care", priority: 5 },
    { keyword: "Walgreens", category: "personal_care", priority: 5 },
  ];

  for (const rule of rules) {
    if (categoryMap[rule.category]) {
      await prisma.categorizationRule.create({
        data: {
          keyword: rule.keyword,
          categoryId: categoryMap[rule.category],
          priority: rule.priority,
        },
      });
    }
  }

  console.log("Seed complete!");
  console.log(`  Categories: ${await prisma.category.count()}`);
  console.log(`  Master budgets: ${await prisma.masterBudget.count()}`);
  console.log(`  Categorization rules: ${await prisma.categorizationRule.count()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
