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
import { Plus, Trash2, Pencil, Check, X, ChevronLeft, ChevronRight, Split, Minus } from "lucide-react";
import { getExpenses, getCategories, deleteExpense, updateExpense, createExpense, createSplitExpense } from "./actions";
import { DescriptionAutocomplete } from "@/components/description-autocomplete";

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

  // Split mode
  const [splitMode, setSplitMode] = useState(false);
  const [splitLines, setSplitLines] = useState<{ categoryId: string; amount: string }[]>([
    { categoryId: "", amount: "" },
    { categoryId: "", amount: "" },
  ]);

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

  function handleSuggestionSelect(suggestion: {
    description: string | null;
    amount: number;
    categoryId: string;
  }) {
    setAddAmount(String(suggestion.amount));
    setAddCategory(suggestion.categoryId);
    if (suggestion.description) setAddDescription(suggestion.description);
  }

  function handleInlineAdd() {
    if (splitMode) {
      handleSplitAdd();
      return;
    }
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
        resetAddForm();
        loadExpenses();
      }
    });
  }

  function handleSplitAdd() {
    const lines = splitLines
      .filter((l) => l.categoryId && l.amount)
      .map((l) => ({ categoryId: l.categoryId, amount: Number(l.amount) }));

    if (lines.length < 2) {
      toast.error("A split needs at least 2 lines with category and amount");
      return;
    }

    startTransition(async () => {
      const result = await createSplitExpense(addDate, addDescription, lines);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Split transaction added!");
        resetAddForm();
        loadExpenses();
      }
    });
  }

  function resetAddForm() {
    setAddAmount("");
    setAddCategory("");
    setAddDate(formatDateValue(new Date()));
    setAddDescription("");
    setSplitMode(false);
    setSplitLines([{ categoryId: "", amount: "" }, { categoryId: "", amount: "" }]);
    setShowAdd(false);
  }

  function updateSplitLine(index: number, field: "categoryId" | "amount", value: string) {
    setSplitLines((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function addSplitLine() {
    setSplitLines((prev) => [...prev, { categoryId: "", amount: "" }]);
  }

  function removeSplitLine(index: number) {
    if (splitLines.length <= 2) return;
    setSplitLines((prev) => prev.filter((_, i) => i !== index));
  }

  const splitTotal = splitLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const splitRemaining = addAmount ? Number(addAmount) - splitTotal : 0;

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

  function getCategoryLabelById(id: string) {
    const cat = categories.find((c) => c.id === id);
    return cat ? categoryLabel(cat) : "";
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-4xl">Transactions</h2>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Quick Add</CardTitle>
              <Button
                variant={splitMode ? "default" : "outline"}
                size="xs"
                className="gap-1.5"
                onClick={() => setSplitMode(!splitMode)}
              >
                <Split className="size-3.5" />
                Split
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Description</Label>
                <DescriptionAutocomplete
                  value={addDescription}
                  onChange={setAddDescription}
                  onSelect={splitMode ? undefined : handleSuggestionSelect}
                  placeholder="Start typing to see past transactions..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !splitMode && addAmount && addCategory) handleInlineAdd();
                    if (e.key === "Escape") resetAddForm();
                  }}
                />
                {!splitMode && (
                  <p className="text-xs text-muted-foreground">
                    Past matches will auto-fill amount and category
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-sm">{splitMode ? "Total Amount" : "Amount"}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-28"
                  />
                </div>
                {!splitMode && (
                  <div className="space-y-1">
                    <Label className="text-sm">Category</Label>
                    <Select
                      value={addCategory}
                      onValueChange={(val) => setAddCategory(val ?? "")}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select..." displayValue={addCategory ? getCategoryLabelById(addCategory) : undefined} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(grouped).map(([group, cats]) => (
                          <SelectGroup key={group}>
                            <SelectLabel>{group}</SelectLabel>
                            {cats.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id} label={categoryLabel(cat)}>
                                {categoryLabel(cat)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-sm">Date</Label>
                  <Input
                    type="date"
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-36"
                  />
                </div>
              </div>

              {/* Split lines */}
              {splitMode && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-sm font-medium">Split between categories</Label>
                  {splitLines.map((line, i) => (
                    <div key={i} className="flex gap-2 items-end">
                      <div className="space-y-1 flex-1">
                        {i === 0 && <Label className="text-xs text-muted-foreground">Category</Label>}
                        <Select
                          value={line.categoryId}
                          onValueChange={(val) => updateSplitLine(i, "categoryId", val ?? "")}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select..." displayValue={line.categoryId ? getCategoryLabelById(line.categoryId) : undefined} />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(grouped).map(([group, cats]) => (
                              <SelectGroup key={group}>
                                <SelectLabel>{group}</SelectLabel>
                                {cats.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id} label={categoryLabel(cat)}>
                                    {categoryLabel(cat)}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        {i === 0 && <Label className="text-xs text-muted-foreground">Amount</Label>}
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={line.amount}
                          onChange={(e) => updateSplitLine(i, "amount", e.target.value)}
                          placeholder="0.00"
                          className="w-28 h-8"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeSplitLine(i)}
                        disabled={splitLines.length <= 2}
                      >
                        <Minus className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="xs" className="gap-1" onClick={addSplitLine}>
                      <Plus className="size-3.5" />
                      Add Line
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Allocated: <span className="font-medium text-foreground">{formatAmount(splitTotal)}</span>
                      {addAmount && splitRemaining !== 0 && (
                        <span className={`ml-2 ${splitRemaining > 0 ? "text-amber-600" : "text-red-600"}`}>
                          ({splitRemaining > 0 ? `${formatAmount(splitRemaining)} remaining` : `${formatAmount(Math.abs(splitRemaining))} over`})
                        </span>
                      )}
                      {addAmount && splitRemaining === 0 && (
                        <span className="ml-2 text-green-600">Balanced</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleInlineAdd}
                disabled={
                  splitMode
                    ? !addDate || splitLines.filter((l) => l.categoryId && l.amount).length < 2 || isPending
                    : !addAmount || !addCategory || isPending
                }
              >
                {splitMode ? "Add Split" : "Add"}
              </Button>
              <Button size="sm" variant="ghost" onClick={resetAddForm}>
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
              <Label className="text-sm">Category</Label>
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val ?? ALL_CATEGORIES)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue displayValue={categoryFilter === ALL_CATEGORIES ? "All Categories" : getCategoryLabelById(categoryFilter)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES} label="All Categories">
                    All Categories
                  </SelectItem>
                  {Object.entries(grouped).map(([group, cats]) => (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}</SelectLabel>
                      {cats.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} label={categoryLabel(cat)}>
                          {categoryLabel(cat)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">To</Label>
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
                          <Label className="text-sm">Amount</Label>
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
                          <Label className="text-sm">Category</Label>
                          <Select
                            value={editCategory}
                            onValueChange={(val) => setEditCategory(val ?? editCategory)}
                          >
                            <SelectTrigger className="w-48 h-8">
                              <SelectValue displayValue={editCategory ? getCategoryLabelById(editCategory) : undefined} />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(grouped).map(([group, cats]) => (
                                <SelectGroup key={group}>
                                  <SelectLabel>{group}</SelectLabel>
                                  {cats.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id} label={categoryLabel(cat)}>
                                      {categoryLabel(cat)}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-sm">Date</Label>
                          <Input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-36 h-8"
                          />
                        </div>
                        <div className="space-y-1 flex-1 min-w-[120px]">
                          <Label className="text-sm">Description</Label>
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
                          <Check className="size-4" />
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
                          <span className="text-sm text-muted-foreground rounded bg-muted px-1.5 py-0.5">
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
                            <span className="text-sm text-destructive mr-1">Delete?</span>
                            <Button
                              variant="destructive"
                              size="icon-xs"
                              onClick={() => handleDelete(expense.id)}
                              disabled={deletingId === expense.id}
                            >
                              <Check className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              <X className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => startEdit(expense)}
                            >
                              <Pencil className="size-4" />
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
                              <Trash2 className="size-4" />
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
                      <ChevronLeft className="size-4" />
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
                      <ChevronRight className="size-4" />
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
