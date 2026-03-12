"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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
import { PlusCircle, Trash2 } from "lucide-react";
import { getExpenses, getCategories, deleteExpense } from "./actions";

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

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, dateFrom, dateTo]);

  function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteExpense(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Expense deleted");
        loadExpenses();
      }
      setDeletingId(null);
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
        <h2 className="text-3xl font-bold">Expenses</h2>
        <Button
          render={<Link href="/dashboard/expenses/new" />}
          nativeButton={false}
          className="gap-1.5"
        >
          <PlusCircle className="size-4" />
          Add Expense
        </Button>
      </div>

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
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
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
              No expenses found. Start by{" "}
              <Link
                href="/dashboard/expenses/new"
                className="text-primary underline"
              >
                adding one
              </Link>
              .
            </p>
          ) : (
            <div className="divide-y">
              {expenses.map((expense) => (
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
                  <Button
                    variant="destructive"
                    size="icon-xs"
                    onClick={() => handleDelete(expense.id)}
                    disabled={deletingId === expense.id}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
