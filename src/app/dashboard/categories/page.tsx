"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Plus, X, Trash2, Pencil } from "lucide-react";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  setBudgetAmount,
  type CategoryRow,
} from "./actions";

const TYPE_LABELS: Record<string, string> = {
  income: "Income",
  fixed: "Fixed Expenses",
  variable: "Variable Expenses",
  tax: "Taxes",
  savings: "Savings",
};

const TYPE_ORDER = ["income", "fixed", "variable", "tax", "savings"];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function CategoryRowItem({
  cat,
  year,
  indent,
  parentOptions,
  onRefresh,
}: {
  cat: CategoryRow;
  year: number;
  indent: boolean;
  parentOptions: CategoryRow[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(cat.name);
  const [editType, setEditType] = useState(cat.type);
  const [editParentId, setEditParentId] = useState(cat.parentId || "__none__");
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const monthlyBudget = Math.round((cat.budgetAmount / 12) * 100) / 100;

  function handleSaveEdit() {
    startTransition(async () => {
      const result = await updateCategory(
        cat.id,
        editName,
        editType,
        editParentId !== "__none__" ? editParentId : undefined
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Updated ${editName}`);
        setEditing(false);
        onRefresh();
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCategory(cat.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Deleted ${cat.name}`);
        onRefresh();
      }
    });
  }

  function handleSaveBudget() {
    const amount = Number(budgetValue);
    if (isNaN(amount) || amount < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    startTransition(async () => {
      const result = await setBudgetAmount(cat.id, year, amount);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Budget set for ${cat.name}`);
        setEditingBudget(false);
        onRefresh();
      }
    });
  }

  // Available parents: exclude self and own children
  const availableParents = parentOptions.filter((p) => p.id !== cat.id);

  if (editing) {
    return (
      <tr className="border-b bg-muted/30">
        <td className="py-2.5 px-1">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-8 w-full"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
          />
        </td>
        <td className="py-2.5 px-1">
          <Select value={editType} onValueChange={(val) => setEditType(val ?? editType)}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue displayValue={TYPE_LABELS[editType] || editType} />
            </SelectTrigger>
            <SelectContent>
              {TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t} label={TYPE_LABELS[t]}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="py-2.5 px-1">
          <Select value={editParentId} onValueChange={(val) => setEditParentId(val ?? "__none__")}>
            <SelectTrigger className="h-8 w-full">
              <SelectValue
                displayValue={
                  editParentId === "__none__"
                    ? "None"
                    : availableParents.find((p) => p.id === editParentId)?.name || "None"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" label="None">None</SelectItem>
              {availableParents.map((p) => (
                <SelectItem key={p.id} value={p.id} label={p.name}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
        <td className="py-2.5 px-1" />
        <td className="py-2.5 px-1">
          <div className="flex items-center gap-1 justify-end">
            <Button variant="ghost" size="icon-xs" onClick={handleSaveEdit} disabled={isPending}>
              <Check className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => setEditing(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b last:border-0 ${cat.isParent ? "bg-primary/5" : ""}`}>
      <td className={`py-2.5 ${indent ? "pl-8" : ""}`}>
        {cat.isParent ? (
          <span className="font-semibold text-foreground text-sm uppercase tracking-wide">
            {cat.name}
          </span>
        ) : (
          cat.name
        )}
      </td>
      <td className="py-2.5">{TYPE_LABELS[cat.type] || cat.type}</td>
      <td className="py-2.5 text-muted-foreground">{cat.parentName || "—"}</td>
      <td className="py-2.5 text-right">
        {cat.isParent ? null : editingBudget ? (
          <div className="flex items-center gap-1 justify-end">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              className="w-28 text-right h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveBudget();
                if (e.key === "Escape") setEditingBudget(false);
              }}
              autoFocus
            />
            <Button variant="ghost" size="icon-xs" onClick={handleSaveBudget} disabled={isPending}>
              <Check className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => setEditingBudget(false)}>
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            className="hover:underline cursor-pointer text-right hover:text-primary transition-colors"
            onClick={() => {
              setBudgetValue(String(monthlyBudget));
              setEditingBudget(true);
            }}
          >
            {cat.budgetAmount === 0 ? "Click to set" : `${formatAmount(monthlyBudget)}/mo`}
          </button>
        )}
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setEditName(cat.name);
              setEditType(cat.type);
              setEditParentId(cat.parentId || "__none__");
              setEditing(true);
            }}
          >
            <Pencil className="size-4" />
          </Button>
          {confirmDelete ? (
            <span className="flex items-center gap-1 text-sm text-destructive">
              Delete?
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-destructive"
                onClick={handleDelete}
                disabled={isPending}
              >
                <Check className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setConfirmDelete(false)}
              >
                <X className="size-4" />
              </Button>
            </span>
          ) : (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function CategoriesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [isPending, startTransition] = useTransition();

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("variable");
  const [newParentId, setNewParentId] = useState("__none__");
  const [newAmount, setNewAmount] = useState("");

  function loadData() {
    startTransition(async () => {
      const data = await getCategories(year);
      setCategories(data);
    });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  function handleAdd() {
    startTransition(async () => {
      const result = await addCategory(
        newName,
        newType,
        newParentId !== "__none__" ? newParentId : undefined,
        newAmount ? Number(newAmount) : undefined,
        year
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added ${newName}`);
        setNewName("");
        setNewParentId("__none__");
        setNewAmount("");
        setShowAdd(false);
        loadData();
      }
    });
  }

  // Group by type with parent-child ordering
  const grouped = TYPE_ORDER.map((type) => {
    const typeRows = categories.filter((r) => r.type === type);
    const sorted: CategoryRow[] = [];
    const parents = typeRows.filter((r) => r.isParent);
    const topLevel = typeRows.filter((r) => !r.parentId && !r.isParent);

    for (const parent of parents) {
      sorted.push(parent);
      const children = typeRows.filter((r) => r.parentId === parent.id);
      sorted.push(...children);
    }
    sorted.push(...topLevel);

    return { type, label: TYPE_LABELS[type] || type, rows: sorted };
  }).filter((g) => g.rows.length > 0);

  const parentOptions = categories.filter((r) => r.isParent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="font-display text-4xl">Categories</h2>
        <div className="flex gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-sm">Budget Year</Label>
            <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
              <SelectTrigger className="w-24">
                <SelectValue displayValue={String(year)} />
              </SelectTrigger>
              <SelectContent>
                {[2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)} label={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowAdd(!showAdd)}
          >
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Add Category Form */}
      {showAdd && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-sm">Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Category name"
                  className="w-48"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Type</Label>
                <Select value={newType} onValueChange={(val) => setNewType(val ?? "variable")}>
                  <SelectTrigger className="w-40">
                    <SelectValue displayValue={TYPE_LABELS[newType] || newType} />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_ORDER.map((t) => (
                      <SelectItem key={t} value={t} label={TYPE_LABELS[t]}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Monthly Budget</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-32"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Parent (optional)</Label>
                <Select
                  value={newParentId}
                  onValueChange={(val) => setNewParentId(val ?? "__none__")}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue
                      displayValue={
                        newParentId === "__none__"
                          ? "None"
                          : parentOptions.find((p) => p.id === newParentId)?.name || "None"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" label="None">None</SelectItem>
                    {parentOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id} label={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || isPending}>
                Add
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isPending && categories.length === 0 && (
        <p className="text-muted-foreground text-sm">Loading...</p>
      )}

      {/* Category Groups */}
      {grouped.map((group) => (
        <Card key={group.type}>
          <CardHeader>
            <CardTitle>{group.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Parent</th>
                  <th className="pb-2 font-medium text-right w-44">Budget</th>
                  <th className="pb-2 font-medium text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((cat) => (
                  <CategoryRowItem
                    key={cat.id}
                    cat={cat}
                    year={year}
                    indent={!!cat.parentId}
                    parentOptions={parentOptions}
                    onRefresh={loadData}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
