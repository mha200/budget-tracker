"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { getBudgetVsActual, type BudgetGroup } from "./actions";
import { createExpense } from "../expenses/actions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function DifferenceCell({ value, type }: { value: number; type: string }) {
  // For income, positive difference means under-earned (bad), negative means over-earned (good)
  // For expenses, positive difference means under-spent (good), negative means over-spent (bad)
  const isGood = type === "income" ? value <= 0 : value >= 0;
  const color = value === 0 ? "text-muted-foreground" : isGood ? "text-green-600" : "text-red-600";

  return (
    <span className={`font-medium ${color}`}>
      {value > 0 ? "+" : ""}{formatAmount(value)}
    </span>
  );
}

function ProgressBar({ budgeted, actual, type }: { budgeted: number; actual: number; type: string }) {
  if (budgeted === 0) return null;
  const pct = Math.min((actual / budgeted) * 100, 100);
  const over = actual > budgeted;
  const isExpense = type !== "income";

  const barColor = over && isExpense
    ? "bg-red-500"
    : pct > 90 && isExpense
      ? "bg-amber-500"
      : "bg-green-500";

  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function BudgetPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [groups, setGroups] = useState<BudgetGroup[]>([]);
  const [isPending, startTransition] = useTransition();

  // Inline actual editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editActualValue, setEditActualValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function loadData() {
    startTransition(async () => {
      const data = await getBudgetVsActual(year, month);
      setGroups(data);
    });
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  function startEditActual(categoryId: string, currentActual: number) {
    setEditingCategoryId(categoryId);
    setEditActualValue(currentActual > 0 ? String(currentActual) : "");
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleActualSubmit() {
    if (!editingCategoryId) return;
    const val = parseFloat(editActualValue);
    if (!val || val <= 0) {
      setEditingCategoryId(null);
      return;
    }

    const formData = new FormData();
    formData.set("amount", String(val));
    formData.set("categoryId", editingCategoryId);
    formData.set("date", `${year}-${String(month).padStart(2, "0")}-15`);
    formData.set("description", "");

    setEditingCategoryId(null);

    startTransition(async () => {
      const result = await createExpense(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Actual entered");
        loadData();
      }
    });
  }

  // Grand totals (expenses only — exclude income)
  const expenseGroups = groups.filter((g) => g.type !== "income");
  const grandBudgeted = expenseGroups.reduce((s, g) => s + g.totalBudgeted, 0);
  const grandActual = expenseGroups.reduce((s, g) => s + g.totalActual, 0);
  const grandDifference = Math.round((grandBudgeted - grandActual) * 100) / 100;

  // Income totals
  const incomeGroup = groups.find((g) => g.type === "income");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-bold">Budget vs. Actual</h2>
        <div className="flex gap-3 items-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            render={<Link href="/dashboard/budget/master" />}
            nativeButton={false}
          >
            <Settings2 className="size-4" />
            Edit Budget
          </Button>
          <div className="space-y-1">
            <Label className="text-sm">Month</Label>
            <Select
              value={String(month)}
              onValueChange={(val) => setMonth(Number(val))}
            >
              <SelectTrigger className="w-36">
                <SelectValue displayValue={MONTHS[month - 1]} />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((name, i) => (
                  <SelectItem key={i} value={String(i + 1)} label={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budgeted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAmount(grandBudgeted)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {MONTHS[month - 1]} expenses
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAmount(grandActual)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {grandBudgeted > 0
                ? `${Math.round((grandActual / grandBudgeted) * 100)}% of budget`
                : "No budget set"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${grandDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatAmount(grandDifference)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {grandDifference >= 0 ? "under budget" : "over budget"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loading state */}
      {isPending && groups.length === 0 && (
        <p className="text-muted-foreground text-sm">Loading budget data...</p>
      )}

      {/* Budget Groups */}
      {groups.map((group) => (
        <Card key={group.type}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{group.label}</CardTitle>
              <div className="text-sm text-muted-foreground space-x-4">
                <span>Budget: <span className="font-medium text-foreground">{formatAmount(group.totalBudgeted)}</span></span>
                <span>Actual: <span className="font-medium text-foreground">{formatAmount(group.totalActual)}</span></span>
                <DifferenceCell value={group.totalDifference} type={group.type} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 font-medium text-right w-28">Budgeted</th>
                    <th className="pb-2 font-medium text-right w-28">Actual</th>
                    <th className="pb-2 font-medium text-right w-28">Remaining</th>
                    <th className="pb-2 font-medium w-32 pl-4">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr
                      key={item.categoryId}
                      className={`border-b last:border-0 ${item.isParent ? "bg-primary/5 [&>td:first-child]:pl-4" : ""}`}
                    >
                      <td className={`py-2.5 ${item.parentId ? "pl-8" : ""}`}>
                        {item.isParent ? (
                          <span className="font-semibold text-foreground text-sm uppercase tracking-wide">
                            {item.categoryName}
                          </span>
                        ) : (
                          item.categoryName
                        )}
                      </td>
                      <td className={`py-2.5 text-right ${item.isParent ? "font-semibold" : ""}`}>
                        {formatAmount(item.budgeted)}
                      </td>
                      <td className={`py-2.5 text-right ${item.isParent ? "font-semibold" : ""}`}>
                        {!item.isParent && editingCategoryId === item.categoryId ? (
                          <Input
                            ref={inputRef}
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editActualValue}
                            onChange={(e) => setEditActualValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleActualSubmit();
                              if (e.key === "Escape") setEditingCategoryId(null);
                            }}
                            onBlur={handleActualSubmit}
                            className="w-24 h-7 text-right text-sm ml-auto"
                          />
                        ) : !item.isParent ? (
                          <button
                            type="button"
                            onClick={() => startEditActual(item.categoryId, item.actual)}
                            className="cursor-pointer hover:bg-muted px-1.5 py-0.5 rounded transition-colors"
                            title="Click to add actual"
                          >
                            {formatAmount(item.actual)}
                          </button>
                        ) : (
                          formatAmount(item.actual)
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <DifferenceCell value={item.difference} type={item.type} />
                      </td>
                      <td className="py-2.5 pl-4">
                        <ProgressBar budgeted={item.budgeted} actual={item.actual} type={item.type} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Income summary if present */}
      {incomeGroup && incomeGroup.totalActual > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {MONTHS[month - 1]} income: <span className="font-medium text-foreground">{formatAmount(incomeGroup.totalActual)}</span> of {formatAmount(incomeGroup.totalBudgeted)} budgeted
              </span>
              <span className={`font-medium ${incomeGroup.totalDifference <= 0 ? "text-green-600" : "text-red-600"}`}>
                {incomeGroup.totalDifference <= 0 ? "+" : ""}{formatAmount(Math.abs(incomeGroup.totalDifference))} {incomeGroup.totalDifference <= 0 ? "over target" : "remaining"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
