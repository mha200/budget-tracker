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
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Plus, X, Trash2 } from "lucide-react";
import {
  getMasterBudget,
  updateMasterBudget,
  addCategory,
  deleteCategory,
  type MasterBudgetRow,
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

function BudgetRow({
  row,
  year,
  indent,
  onDelete,
  onUpdate,
  childrenTotal,
}: {
  row: MasterBudgetRow;
  year: number;
  indent: boolean;
  onDelete: (id: string, name: string) => void;
  onUpdate: () => void;
  childrenTotal?: number;
}) {
  const monthlyAmount = Math.round((row.annualAmount / 12) * 100) / 100;
  const [editingCol, setEditingCol] = useState<"monthly" | "annual" | null>(null);
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function startEdit(col: "monthly" | "annual") {
    setValue(
      col === "monthly"
        ? String(monthlyAmount)
        : String(row.annualAmount)
    );
    setEditingCol(col);
  }

  function handleSave() {
    const entered = Number(value);
    const annual =
      editingCol === "monthly"
        ? Math.round(entered * 12 * 100) / 100
        : Math.round(entered * 100) / 100;
    startTransition(async () => {
      const result = await updateMasterBudget(row.categoryId, year, annual);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Updated ${row.categoryName}`);
        setEditingCol(null);
        onUpdate();
      }
    });
  }

  function handleCancel() {
    setEditingCol(null);
  }

  const parentMonthly = (childrenTotal ?? 0) / 12;

  // Preview: show what the other column would be while editing
  const previewMonthly =
    editingCol === "annual" ? Number(value) / 12 : Number(value);
  const previewAnnual =
    editingCol === "monthly" ? Number(value) * 12 : Number(value);

  function renderEditInput() {
    return (
      <div className="flex items-center gap-1 justify-end">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-28 text-right h-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          autoFocus
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleSave}
          disabled={isPending}
        >
          <Check className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-xs" onClick={handleCancel}>
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <tr className={`border-b last:border-0 ${row.isParent ? "bg-primary/5 [&>td:first-child]:pl-4" : ""}`}>
      <td className={`py-2.5 ${indent ? "pl-8" : ""}`}>
        {row.isParent ? (
          <span className="font-semibold text-foreground text-sm uppercase tracking-wide">{row.categoryName}</span>
        ) : (
          row.categoryName
        )}
      </td>
      <td className="py-2.5 text-right w-40">
        {row.isParent ? (
          <span className="font-semibold text-foreground">{formatAmount(parentMonthly)}</span>
        ) : editingCol === "monthly" ? (
          renderEditInput()
        ) : (
          <button
            className="hover:underline cursor-pointer text-right"
            onClick={() => startEdit("monthly")}
          >
            {editingCol === "annual" ? formatAmount(previewMonthly) : formatAmount(monthlyAmount)}
          </button>
        )}
      </td>
      <td className="py-2.5 text-right w-28">
        {row.isParent ? (
          <span className="font-semibold text-foreground">{formatAmount(childrenTotal ?? 0)}</span>
        ) : editingCol === "annual" ? (
          renderEditInput()
        ) : (
          <button
            className="hover:underline cursor-pointer text-right text-muted-foreground"
            onClick={() => startEdit("annual")}
          >
            {editingCol === "monthly" ? formatAmount(previewAnnual) : formatAmount(row.annualAmount)}
          </button>
        )}
      </td>
      <td className="py-2.5 text-center w-12">
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(row.categoryId, row.categoryName)}
        >
          <Trash2 className="size-4" />
        </Button>
      </td>
    </tr>
  );
}

export default function MasterBudgetPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<MasterBudgetRow[]>([]);
  const [isPending, startTransition] = useTransition();

  // Add category form state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("variable");
  const [newParentId, setNewParentId] = useState("");
  const NO_PARENT = "__none__";

  function loadData() {
    startTransition(async () => {
      const data = await getMasterBudget(year);
      setRows(data);
    });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // Group by type, preserving parent-child order
  const grouped = TYPE_ORDER.map((type) => {
    const typeRows = rows.filter((r) => r.type === type);
    // Sort: parents first, then children under their parent
    const sorted: MasterBudgetRow[] = [];
    const parents = typeRows.filter((r) => r.isParent);
    const topLevel = typeRows.filter((r) => !r.parentId && !r.isParent);

    for (const parent of parents) {
      sorted.push(parent);
      const children = typeRows.filter((r) => r.parentId === parent.categoryId);
      sorted.push(...children);
    }
    sorted.push(...topLevel);

    const leafRows = typeRows.filter((r) => !r.isParent);
    const total = leafRows.reduce((s, r) => s + r.annualAmount, 0);

    return { type, label: TYPE_LABELS[type] || type, rows: sorted, total };
  }).filter((g) => g.rows.length > 0);

  // Potential parent categories for the add form
  const parentOptions = rows.filter((r) => r.isParent);

  function handleDelete(categoryId: string, categoryName: string) {
    if (!confirm(`Delete "${categoryName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteCategory(categoryId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Deleted ${categoryName}`);
        loadData();
      }
    });
  }

  function handleAddCategory() {
    startTransition(async () => {
      const result = await addCategory(
        newName,
        newType,
        newParentId && newParentId !== NO_PARENT ? newParentId : undefined
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Added ${newName}`);
        setNewName("");
        setNewParentId("");
        setShowAdd(false);
        loadData();
      }
    });
  }

  const grandTotal = rows
    .filter((r) => !r.isParent)
    .reduce((s, r) => s + r.annualAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-bold">Master Budget</h2>
        <div className="flex gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-sm">Year</Label>
            <Select
              value={String(year)}
              onValueChange={(val) => setYear(Number(val))}
            >
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
                <Label className="text-sm">Parent (optional)</Label>
                <Select
                  value={newParentId || NO_PARENT}
                  onValueChange={(val) => setNewParentId(val ?? "")}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue displayValue={!newParentId || newParentId === NO_PARENT ? "None" : parentOptions.find((p) => p.categoryId === newParentId)?.categoryName || "None"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT} label="None">None</SelectItem>
                    {parentOptions.map((p) => (
                      <SelectItem key={p.categoryId} value={p.categoryId} label={p.categoryName}>
                        {p.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                onClick={handleAddCategory}
                disabled={!newName.trim() || isPending}
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdd(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isPending && rows.length === 0 && (
        <p className="text-muted-foreground text-sm">Loading...</p>
      )}

      {/* Budget Groups */}
      {grouped.map((group) => (
        <Card key={group.type}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{group.label}</CardTitle>
              <span className="text-sm text-muted-foreground">
                Monthly: <span className="font-medium text-foreground">{formatAmount(group.total / 12)}</span>
                <span className="ml-3">Annual: <span className="font-medium text-foreground">{formatAmount(group.total)}</span></span>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right w-40">Monthly Budget</th>
                  <th className="pb-2 font-medium text-right w-28">Annual</th>
                  <th className="pb-2 font-medium text-center w-12"></th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => {
                  const childrenTotal = row.isParent
                    ? group.rows
                        .filter((r) => r.parentId === row.categoryId)
                        .reduce((sum, r) => sum + r.annualAmount, 0)
                    : undefined;
                  return (
                    <BudgetRow
                      key={row.categoryId}
                      row={row}
                      year={year}
                      indent={!!row.parentId}
                      onDelete={handleDelete}
                      onUpdate={loadData}
                      childrenTotal={childrenTotal}
                    />
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {/* Grand Total */}
      {rows.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Grand total: {formatAmount(grandTotal / 12)} / month ({formatAmount(grandTotal)} / year)
        </div>
      )}
    </div>
  );
}
