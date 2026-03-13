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
import { Plus, Trash2, Check, X, Play } from "lucide-react";
import { getCategories } from "../actions";
import {
  getRecurringExpenses,
  createRecurringExpense,
  deleteRecurringExpense,
  applyRecurringExpenses,
} from "./actions";

type Category = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
};

type RecurringExpense = {
  id: string;
  amount: number;
  description: string | null;
  frequency: string;
  dayOfMonth: number | null;
  lastApplied: Date | string | null;
  category: Category;
};

const typeLabels: Record<string, string> = {
  fixed: "Fixed Expenses",
  variable: "Variable Expenses",
  tax: "Taxes",
  savings: "Savings",
};

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function RecurringExpensesPage() {
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isPending, startTransition] = useTransition();

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function loadData() {
    startTransition(async () => {
      const data = await getRecurringExpenses();
      setRecurring(data);
    });
  }

  useEffect(() => {
    getCategories().then(setCategories);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = categories.reduce(
    (acc, cat) => {
      const hasChildren = categories.some((c) => c.parentId === cat.id);
      if (hasChildren) return acc;
      if (cat.type === "income") return acc;
      const group = typeLabels[cat.type] || cat.type;
      if (!acc[group]) acc[group] = [];
      acc[group].push(cat);
      return acc;
    },
    {} as Record<string, Category[]>
  );

  function categoryLabel(cat: Category) {
    return cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name;
  }

  function handleAdd() {
    const formData = new FormData();
    formData.set("amount", amount);
    formData.set("categoryId", categoryId);
    formData.set("description", description);
    formData.set("frequency", frequency);
    if (frequency === "monthly") formData.set("dayOfMonth", dayOfMonth);

    startTransition(async () => {
      const result = await createRecurringExpense(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Recurring expense added");
        setAmount("");
        setCategoryId("");
        setDescription("");
        setFrequency("monthly");
        setDayOfMonth("1");
        setShowAdd(false);
        loadData();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteRecurringExpense(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Recurring expense removed");
        loadData();
      }
      setConfirmDeleteId(null);
    });
  }

  function handleApply() {
    startTransition(async () => {
      const result = await applyRecurringExpenses();
      if (result.error) {
        toast.error(result.error);
      } else if (result.applied === 0) {
        toast.info("All recurring expenses already applied for this period");
      } else {
        toast.success(`Applied ${result.applied} recurring expense${result.applied !== 1 ? "s" : ""}`);
        loadData();
      }
    });
  }

  const monthlyTotal = recurring
    .filter((r) => r.frequency === "monthly")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-bold">Recurring Expenses</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleApply}
            disabled={isPending || recurring.length === 0}
          >
            <Play className="size-4" />
            Apply Now
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowAdd(!showAdd)}
          >
            <Plus className="size-4" />
            Add Recurring
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Recurring Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-sm">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-28"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Category</Label>
                <Select
                  value={categoryId}
                  onValueChange={(val) => setCategoryId(val ?? "")}
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
                <Label className="text-sm">Frequency</Label>
                <Select
                  value={frequency}
                  onValueChange={(val) => setFrequency(val ?? "monthly")}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {frequency === "monthly" && (
                <div className="space-y-1">
                  <Label className="text-sm">Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="w-20"
                  />
                </div>
              )}
              <div className="space-y-1 flex-1 min-w-[120px]">
                <Label className="text-sm">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Netflix subscription"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!amount || !categoryId || isPending}
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

      {/* Recurring List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {recurring.length} recurring expense{recurring.length !== 1 ? "s" : ""}
            </CardTitle>
            {monthlyTotal > 0 && (
              <span className="text-sm text-muted-foreground">
                Monthly total: <span className="font-medium text-foreground">{formatAmount(monthlyTotal)}</span>
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isPending && recurring.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">Loading...</p>
          ) : recurring.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">
              No recurring expenses set up yet. Add one to automate regular bills.
            </p>
          ) : (
            <div className="divide-y">
              {recurring.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatAmount(rec.amount)}</span>
                      <span className="text-sm text-muted-foreground rounded bg-muted px-1.5 py-0.5">
                        {categoryLabel(rec.category)}
                      </span>
                      <span className="text-sm text-muted-foreground rounded bg-primary/10 text-primary px-1.5 py-0.5">
                        {rec.frequency}
                        {rec.frequency === "monthly" && rec.dayOfMonth ? ` (day ${rec.dayOfMonth})` : ""}
                      </span>
                    </div>
                    {rec.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{rec.description}</p>
                    )}
                    {rec.lastApplied && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Last applied: {new Date(rec.lastApplied).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {confirmDeleteId === rec.id ? (
                      <>
                        <span className="text-sm text-destructive mr-1">Delete?</span>
                        <Button
                          variant="destructive"
                          size="icon-xs"
                          onClick={() => handleDelete(rec.id)}
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
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setConfirmDeleteId(rec.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
