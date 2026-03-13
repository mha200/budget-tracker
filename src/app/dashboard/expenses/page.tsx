"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { getExpenses, getCategories, deleteExpense, updateExpense, createExpense } from "./actions";

type Category = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
};

type Expense = {
  id: string;
  amount: number;
  date: Date | string;
  description: string | null;
  source: string;
  category: Category;
};

const ALL_CATEGORIES = "__all__";
const PAGE_SIZE = 15;

function formatDateValue(date: Date | string) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isPending, startTransition] = useTransition();

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Inline add
  const [showAdd, setShowAdd] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addDate, setAddDate] = useState(formatDateValue(new Date()));
  const [addDescription, setAddDescription] = useState("");

  // Pagination
  const [page, setPage] = useState(1);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  function loadExpenses() {
    startTransition(async () => {
      const data = await getExpenses({
        categoryId:
          categoryFilter !== ALL_CATEGORIES ? categoryFilter : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setExpenses(data);
    });
  }

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    loadExpenses();
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, dateFrom, dateTo]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
  const pagedExpenses = expenses.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  function startEdit(expense: Expense) {
    setEditingId(expense.id);
    setEditAmount(String(expense.amount));
    setEditCategory(expense.category.id);
    setEditDate(formatDateValue(expense.date));
    setEditDescription(expense.description || "");
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleSave(id: string) {
    const formData = new FormData();
    formData.set("amount", editAmount);
    formData.set("categoryId", editCategory);
    formData.set("date", editDate);
    formData.set("description", editDescription);

    startTransition(async () => {
      const result = await updateExpense(id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Transaction updated");
        setEditingId(null);
        loadExpenses();
      }
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteExpense(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Transaction deleted");
        loadExpenses();
      }
      setDeletingId(null);
      setConfirmDeleteId(null);
    });
  }

  function handleInlineAdd() {
    const formData = new FormData();
    formData.set("amount", addAmount);
    formData.set("categoryId", addCategory);
    formData.set("date", addDate);
    formData.set("description", addDescription);

    startTransition(async () => {
      const result = await createExpense(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Transaction added!");
        setAddAmount("");
        setAddCategory("");
        setAddDate(formatDateValue(new Date()));
        setAddDescription("");
        setShowAdd(false);
        loadExpenses();
      }
    });
  }

  // Build category options (leaf only, grouped by type)
  const typeLabels: Record<string, string> = {
    fixed: "Fixed Expenses",
    variable: "Variable Expenses",
    tax: "Taxes",
    savings: "Savings",
    income: "Income",
  };

  const grouped = categories.reduce(
    (acc, cat) => {
      const hasChildren = categories.some((c) => c.parentId === cat.id);
      if (hasChildren) return acc;
      const group = typeLabels[cat.type] || cat.type;
      if (!acc[group]) acc[group] = [];
      acc[group].push(cat);
      return acc;
    },
    {} as Record<string, Category[]>
  );

  function formatAmount(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function categoryLabel(cat: Category) {
    return cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name;
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Transactions</h2>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="size-4" />
          Add Transaction
        </Button>
      </div>

      {/* Inline Add Form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Add</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-28"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select
                  value={addCategory}
                  onValueChange={(val) => setAddCategory(val ?? "")}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(grouped).map(([group, cats]) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {cats.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {categoryLabel(cat)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-36"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[120px]">
                <Label className="text-xs">Description</Label>
                <Input
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="e.g. Paycheck, groceries..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInlineAdd();
                    if (e.key === "Escape") setShowAdd(false);
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInlineAdd}
                disabled={!addAmount || !addCategory || isPending}
              >
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val ?? ALL_CATEGORIES)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES}>
                    All Categories
                  </SelectItem>
                  {Object.entries(grouped).map(([group, cats]) => (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}</SelectLabel>
                      {cats.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {categoryLabel(cat)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
              />
            </div>
            {(categoryFilter !== ALL_CATEGORIES || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter(ALL_CATEGORIES);
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {expenses.length} transaction{expenses.length !== 1 ? "s" : ""}
            </CardTitle>
            {expenses.length > 0 && (
              <span className="text-sm font-medium">
                Total: {formatAmount(total)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isPending && expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Loading...</p>
          ) : expenses.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No transactions found. Click &quot;Add Transaction&quot; above to get started.
            </p>
          ) : (
            <>
              <div className="divide-y">
                {pagedExpenses.map((expense) =>
                  editingId === expense.id ? (
                    <div key={expense.id} className="py-3 space-y-3 bg-muted/30 -mx-4 px-4 rounded">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="space-y-1">
                          <Label className="text-xs">Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-28 h-8"
                            autoFocus
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={editCategory}
                            onValueChange={(val) => setEditCategory(val ?? editCategory)}
                          >
                            <SelectTrigger className="w-48 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(grouped).map(([group, cats]) => (
                                <SelectGroup key={group}>
                                  <SelectLabel>{group}</SelectLabel>
                                  {cats.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {categoryLabel(cat)}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Date</Label>
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-36 h-8"
                          />
                        </div>
                        <div className="space-y-1 flex-1 min-w-[120px]">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Optional"
                            className="h-8"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(expense.id);
                              if (e.key === "Escape") cancelEdit();
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="xs"
                          onClick={() => handleSave(expense.id)}
                          disabled={isPending}
                          className="gap-1"
                        >
                          <Check className="size-3" />
                          Save
                        </Button>
                        <Button size="xs" variant="ghost" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between py-3 gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatAmount(expense.amount)}
                          </span>
                          <span className="text-xs text-muted-foreground rounded bg-muted px-1.5 py-0.5">
                            {categoryLabel(expense.category)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {formatDate(expense.date)}
                          {expense.description && ` — ${expense.description}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {confirmDeleteId === expense.id ? (
                          <>
                            <span className="text-xs text-destructive mr-1">Delete?</span>
                            <Button
                              variant="destructive"
                              size="icon-xs"
                              onClick={() => handleDelete(expense.id)}
                              disabled={deletingId === expense.id}
                            >
                              <Check className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              <X className="size-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => startEdit(expense)}
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                setConfirmDeleteId(expense.id);
                                setEditingId(null);
                              }}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, expenses.length)} of {expenses.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon-xs"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      <ChevronLeft className="size-3" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="xs"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="icon-xs"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      <ChevronRight className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
