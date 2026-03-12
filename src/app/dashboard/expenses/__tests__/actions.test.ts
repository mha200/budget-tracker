import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs before vi.mock hoisting, so these are available in mock factories
const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    category: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    expense: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock Next.js server dependencies
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock auth — controls whether the user is "signed in" for each test
vi.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock Prisma — we don't want tests hitting a real database
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

// Now import the actions (they'll use our mocks)
import { createExpense, getCategories, getExpenses, deleteExpense } from "../actions";

// Helper to build FormData from an object
function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.set(key, value);
  }
  return fd;
}

describe("createExpense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user is signed in
    mockAuth.mockResolvedValue({ user: { id: "user-1", name: "Maureen" } });
  });

  it("rejects unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);

    const fd = makeFormData({
      amount: "50",
      categoryId: "cat-1",
      date: "2026-03-12",
    });
    const result = await createExpense(fd);

    expect(result.error).toBe("Not authenticated");
    expect(mockPrisma.expense.create).not.toHaveBeenCalled();
  });

  it("rejects a negative amount", async () => {
    const fd = makeFormData({
      amount: "-10",
      categoryId: "cat-1",
      date: "2026-03-12",
    });
    const result = await createExpense(fd);

    expect(result.error).toBeDefined();
    expect(mockPrisma.expense.create).not.toHaveBeenCalled();
  });

  it("rejects zero amount", async () => {
    const fd = makeFormData({
      amount: "0",
      categoryId: "cat-1",
      date: "2026-03-12",
    });
    const result = await createExpense(fd);

    expect(result.error).toBeDefined();
    expect(mockPrisma.expense.create).not.toHaveBeenCalled();
  });

  it("rejects missing category", async () => {
    const fd = makeFormData({
      amount: "50",
      categoryId: "",
      date: "2026-03-12",
    });
    const result = await createExpense(fd);

    expect(result.error).toBe("Category is required");
    expect(mockPrisma.expense.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid category ID", async () => {
    mockPrisma.category.findUnique.mockResolvedValue(null);

    const fd = makeFormData({
      amount: "50",
      categoryId: "nonexistent",
      date: "2026-03-12",
      description: "",
    });
    const result = await createExpense(fd);

    expect(result.error).toBe("Invalid category");
    expect(mockPrisma.expense.create).not.toHaveBeenCalled();
  });

  it("creates an expense with valid data", async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1", name: "Groceries" });
    mockPrisma.expense.create.mockResolvedValue({ id: "exp-1" });

    const fd = makeFormData({
      amount: "85.43",
      categoryId: "cat-1",
      date: "2026-03-12",
      description: "Whole Foods weekly groceries",
    });
    const result = await createExpense(fd);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockPrisma.expense.create).toHaveBeenCalledWith({
      data: {
        amount: 85.43,
        categoryId: "cat-1",
        date: expect.any(Date),
        description: "Whole Foods weekly groceries",
        source: "manual",
      },
    });
  });

  it("sets description to null when empty", async () => {
    mockPrisma.category.findUnique.mockResolvedValue({ id: "cat-1", name: "Groceries" });
    mockPrisma.expense.create.mockResolvedValue({ id: "exp-1" });

    const fd = makeFormData({
      amount: "25",
      categoryId: "cat-1",
      date: "2026-03-12",
      description: "",
    });
    const result = await createExpense(fd);

    expect(result.success).toBe(true);
    expect(mockPrisma.expense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ description: null }),
    });
  });
});

describe("getCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns active categories sorted by sort order", async () => {
    const mockCategories = [
      { id: "1", name: "Groceries", type: "variable", sort: 50, active: true, parent: null },
      { id: "2", name: "Rent", type: "fixed", sort: 11, active: true, parent: { id: "3", name: "Housing" } },
    ];
    mockPrisma.category.findMany.mockResolvedValue(mockCategories);

    const result = await getCategories();

    expect(result).toEqual(mockCategories);
    expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
      where: { active: true },
      include: { parent: true },
      orderBy: { sort: "asc" },
    });
  });
});

describe("getExpenses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns empty array when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await getExpenses();

    expect(result).toEqual([]);
    expect(mockPrisma.expense.findMany).not.toHaveBeenCalled();
  });

  it("fetches all expenses when no filters given", async () => {
    mockPrisma.expense.findMany.mockResolvedValue([]);

    await getExpenses();

    expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
      where: {},
      include: { category: { include: { parent: true } } },
      orderBy: { date: "desc" },
    });
  });

  it("filters by category ID", async () => {
    mockPrisma.expense.findMany.mockResolvedValue([]);

    await getExpenses({ categoryId: "cat-1" });

    expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
      where: { categoryId: "cat-1" },
      include: expect.any(Object),
      orderBy: { date: "desc" },
    });
  });

  it("filters by date range", async () => {
    mockPrisma.expense.findMany.mockResolvedValue([]);

    await getExpenses({ dateFrom: "2026-03-01", dateTo: "2026-03-31" });

    const call = mockPrisma.expense.findMany.mock.calls[0][0];
    expect(call.where.date.gte).toEqual(new Date("2026-03-01"));
    expect(call.where.date.lte).toEqual(new Date("2026-03-31T23:59:59"));
  });
});

describe("deleteExpense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("rejects unauthenticated users", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await deleteExpense("exp-1");

    expect(result.error).toBe("Not authenticated");
    expect(mockPrisma.expense.delete).not.toHaveBeenCalled();
  });

  it("deletes an expense and returns success", async () => {
    mockPrisma.expense.delete.mockResolvedValue({ id: "exp-1" });

    const result = await deleteExpense("exp-1");

    expect(result.success).toBe(true);
    expect(mockPrisma.expense.delete).toHaveBeenCalledWith({
      where: { id: "exp-1" },
    });
  });
});
