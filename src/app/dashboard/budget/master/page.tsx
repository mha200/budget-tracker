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
import { Check, Plus, X } from "lucide-react";
import {
  getMasterBudget,
  updateMasterBudget,
  addCategory,
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
}: {
  row: MasterBudgetRow;
  year: number;
  indent: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(row.annualAmount));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateMasterBudget(row.categoryId, year, Number(value));
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Updated ${row.categoryName}`);
        setEditing(false);
      }
    });
  }

  function handleCancel() {
    setValue(String(row.annualAmount));
    setEditing(false);
  }

  return (
    <tr className="border-b last:border-0">
      <td className={`py-2.5 ${indent ? "pl-6" : ""}`}>
        {row.isParent ? (
          <span className="font-medium text-muted-foreground">{row.categoryName}</span>
        ) : (
          row.categoryName
        )}
      </td>
      <td className="py-2.5 text-right w-40">
        {row.isParent ? (
          <span className="text-muted-foreground">—</span>
        ) : editing ? (
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
              <Check className="size-3" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={handleCancel}>
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <button
            className="hover:underline cursor-pointer text-right"
            onClick={() => setEditing(true)}
          >
            {formatAmount(row.annualAmount)}
          </button>
        )}
      </td>
      <td className="py-2.5 text-right text-muted-foreground w-28">
        {row.isParent ? "" : formatAmount(row.annualAmount / 12)}
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
            <Label className="text-xs">Year</Label>
            <Select
              value={String(year)}
              onValueChange={(val) => setYear(Number(val))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2025, 2026, 2027].map((y) => (
                  <SelectItem key={y} value={String(y)}>
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
                <Label className="text-xs">Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Category name"
                  className="w-48"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={newType} onValueChange={(val) => setNewType(val ?? "variable")}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_ORDER.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Parent (optional)</Label>
                <Select
                  value={newParentId || NO_PARENT}
                  onValueChange={(val) => setNewParentId(val ?? "")}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT}>None</SelectItem>
                    {parentOptions.map((p) => (
                      <SelectItem key={p.categoryId} value={p.categoryId}>
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
                Annual: <span className="font-medium text-foreground">{formatAmount(group.total)}</span>
                <span className="ml-3">Monthly: <span className="font-medium text-foreground">{formatAmount(group.total / 12)}</span></span>
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium text-right w-40">Annual Budget</th>
                  <th className="pb-2 font-medium text-right w-28">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => (
                  <BudgetRow
                    key={row.categoryId}
                    row={row}
                    year={year}
                    indent={!!row.parentId}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {/* Grand Total */}
      {rows.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Grand total: {formatAmount(grandTotal)} / year ({formatAmount(grandTotal / 12)} / month)
        </div>
      )}
    </div>
  );
}
