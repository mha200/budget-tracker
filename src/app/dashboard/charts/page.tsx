"use client";

import { useEffect, useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronLeft } from "lucide-react";
import {
  getMonthlyTrend,
  getSpendingByType,
  getCategoryBreakdown,
  getBudgetVsActualChart,
  type MonthlyTrend,
  type CategoryBreakdown,
  type BudgetVsActualBar,
} from "./actions";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PIE_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#ca8a04", "#9333ea",
  "#0891b2", "#e11d48", "#65a30d", "#d97706", "#7c3aed",
];

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border bg-background p-2 shadow text-sm">
      <p className="font-medium">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {formatAmount(entry.value)}
        </p>
      ))}
    </div>
  );
}

const TYPE_FILTERS: { key: string; label: string }[] = [
  { key: "fixed", label: "Fixed" },
  { key: "variable", label: "Variable" },
  { key: "tax", label: "Taxes" },
  { key: "savings", label: "Savings" },
];

function BudgetVsActualDrilldown({
  data,
  month,
  year,
}: {
  data: BudgetVsActualBar[];
  month: string;
  year: number;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    new Set(TYPE_FILTERS.map((t) => t.key))
  );

  function toggleType(key: string) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const filtered = data.filter((d) => activeTypes.has(d.type));
  const expanded = filtered.find((d) => d.id === expandedId);
  const chartData = expanded?.children ?? filtered;
  const title = expanded
    ? `${expanded.category} — ${month} ${year}`
    : `Budget vs. Actual — ${month} ${year}`;

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {expanded && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setExpandedId(null)}
              >
                <ChevronLeft className="size-4" />
              </Button>
            )}
            <CardTitle>{title}</CardTitle>
          </div>
          {!expanded && (
            <div className="flex gap-1.5">
              {TYPE_FILTERS.map((tf) => (
                <Button
                  key={tf.key}
                  variant={activeTypes.has(tf.key) ? "default" : "outline"}
                  size="xs"
                  onClick={() => toggleType(tf.key)}
                >
                  {tf.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        {!expanded && filtered.some((d) => d.isParent) && (
          <p className="text-sm text-muted-foreground mt-1">
            Click a category to see its breakdown
          </p>
        )}
      </CardHeader>
      <CardContent className="overflow-visible p-6 [&_*]:outline-none">
        {chartData.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            No budget or expense data for {month}.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(350, chartData.length * 70 + 120)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 30, right: 30, bottom: 40, left: 30 }}
              barGap={8}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => formatAmount(v)} tick={{ fontSize: 14 }} />
              <YAxis
                type="category"
                dataKey="category"
                width={150}
                tick={({ x, y, payload }: { x: string | number; y: string | number; payload: { value: string } }) => {
                  const item = chartData.find((d) => d.category === payload.value);
                  const clickable = item?.isParent && !expanded;
                  return (
                    <text
                      x={x}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="central"
                      fontSize={14}
                      fontWeight={clickable ? 600 : 400}
                      fill={clickable ? "var(--color-primary)" : "var(--color-foreground)"}
                      style={clickable ? { cursor: "pointer" } : undefined}
                      onClick={() => {
                        if (clickable && item) setExpandedId(item.id);
                      }}
                    >
                      {payload.value}{clickable ? " ▸" : ""}
                    </text>
                  );
                }}
              />
              <Tooltip content={<CustomTooltipContent />} />
              <Legend />
              <Bar
                dataKey="budgeted"
                name="Budgeted"
                fill="#93c5fd"
                radius={[0, 4, 4, 0]}
                style={{ cursor: expanded ? "default" : "pointer" }}
                onClick={(_data, index) => {
                  if (expanded || index === undefined) return;
                  const item = chartData[index];
                  const top = filtered.find((d) => d.category === item?.category);
                  if (top?.isParent) setExpandedId(top.id);
                }}
              />
              <Bar
                dataKey="actual"
                name="Actual"
                fill="#2563eb"
                radius={[0, 4, 4, 0]}
                style={{ cursor: expanded ? "default" : "pointer" }}
                onClick={(_data, index) => {
                  if (expanded || index === undefined) return;
                  const item = chartData[index];
                  const top = filtered.find((d) => d.category === item?.category);
                  if (top?.isParent) setExpandedId(top.id);
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export default function ChartsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [isPending, startTransition] = useTransition();

  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<CategoryBreakdown[]>([]);
  const [catBreakdown, setCatBreakdown] = useState<CategoryBreakdown[]>([]);
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActualBar[]>([]);

  useEffect(() => {
    startTransition(async () => {
      const [trendData, typeData, catData, bvaData] = await Promise.all([
        getMonthlyTrend(year),
        getSpendingByType(year, month),
        getCategoryBreakdown(year, month),
        getBudgetVsActualChart(year, month),
      ]);
      setTrend(trendData);
      setTypeBreakdown(typeData);
      setCatBreakdown(catData);
      setBudgetVsActual(bvaData);
    });
  }, [year, month]);

  const hasData = catBreakdown.length > 0 || trend.some((t) => t.total > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-bold">Charts</h2>
        <div className="flex gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-sm">Month</Label>
            <Select
              value={String(month)}
              onValueChange={(val) => setMonth(Number(val ?? month))}
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
              onValueChange={(val) => setYear(Number(val ?? year))}
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

      {isPending && !hasData && (
        <p className="text-muted-foreground text-sm">Loading charts...</p>
      )}

      {/* Monthly Spending Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend — {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {trend.every((t) => t.total === 0) ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No expenses recorded for {year}.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 14 }} />
                <YAxis tickFormatter={(v) => formatAmount(v)} tick={{ fontSize: 14 }} />
                <Tooltip content={<CustomTooltipContent />} />
                <Bar dataKey="total" name="Spent" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Spending by Type + Category Breakdown side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Type — {MONTHS[month - 1]}</CardTitle>
          </CardHeader>
          <CardContent>
            {typeBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No expenses for {MONTHS[month - 1]}.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeBreakdown}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={{ style: { fontSize: 14 } }}
                    style={{ fontSize: 14 }}
                  >
                    {typeBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatAmount(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Categories — {MONTHS[month - 1]}</CardTitle>
          </CardHeader>
          <CardContent>
            {catBreakdown.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No expenses for {MONTHS[month - 1]}.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={catBreakdown.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatAmount(v)} tick={{ fontSize: 14 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    tick={{ fontSize: 14 }}
                  />
                  <Tooltip content={<CustomTooltipContent />} />
                  <Bar dataKey="amount" name="Spent" fill="#16a34a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Actual */}
      <BudgetVsActualDrilldown data={budgetVsActual} month={MONTHS[month - 1]} year={year} />
    </div>
  );
}
