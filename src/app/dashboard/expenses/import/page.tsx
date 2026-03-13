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
import { Upload, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { parseCSV, type ParsedRow } from "./csv-parser";
import { categorizeRows, commitImport } from "./actions";
import { getCategories } from "../actions";

type Category = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
};

type ReviewRow = ParsedRow & {
  categoryId: string;
};

const typeLabels: Record<string, string> = {
  income: "Income",
  fixed: "Fixed Expenses",
  variable: "Variable Expenses",
  tax: "Taxes",
  savings: "Savings",
};

const PAGE_SIZE = 20;

export default function ImportPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isPending, startTransition] = useTransition();

  // Phase: upload → review → done
  const [phase, setPhase] = useState<"upload" | "review" | "done">("upload");

  // Upload phase
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);

  // Review phase
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [filename, setFilename] = useState("");
  const [totalParsed, setTotalParsed] = useState(0);
  const [page, setPage] = useState(1);

  // Done phase
  const [committedCount, setCommittedCount] = useState(0);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Category helpers
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

  function categoryLabel(cat: Category) {
    return cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name;
  }

  function getCategoryLabelById(id: string) {
    const cat = categories.find((c) => c.id === id);
    return cat ? categoryLabel(cat) : "";
  }

  function formatAmount(amount: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  // Parse & categorize
  function handleParse() {
    if (!file) return;
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);

      if (!result.success) {
        toast.error(result.error);
        setParsing(false);
        return;
      }

      setTotalParsed(result.rows.length);
      setFilename(file.name);

      // Auto-categorize via server action
      startTransition(async () => {
        const { categoryIds } = await categorizeRows(
          result.rows.map((r) => r.description)
        );

        const reviewRows: ReviewRow[] = result.rows.map((row, i) => ({
          ...row,
          categoryId: categoryIds[i] || "",
        }));

        setRows(reviewRows);
        setPhase("review");
        setParsing(false);
        setPage(1);

        const categorized = categoryIds.filter(Boolean).length;
        if (categorized > 0) {
          toast.success(
            `Auto-categorized ${categorized} of ${result.rows.length} transactions`
          );
        }
      });
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setParsing(false);
    };
    reader.readAsText(file);
  }

  // Row toggles
  function toggleRow(rowIndex: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.rowIndex === rowIndex ? { ...r, included: !r.included } : r
      )
    );
  }

  function setRowCategory(rowIndex: number, categoryId: string) {
    setRows((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? { ...r, categoryId } : r))
    );
  }

  // Commit
  function handleCommit() {
    const included = rows.filter((r) => r.included);
    const missing = included.filter((r) => !r.categoryId);

    if (missing.length > 0) {
      toast.error(
        `${missing.length} included transaction${missing.length !== 1 ? "s" : ""} still need a category`
      );
      return;
    }

    startTransition(async () => {
      const result = await commitImport({
        filename,
        totalParsed,
        rows: included.map((r) => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
          categoryId: r.categoryId,
        })),
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        setCommittedCount(result.committed || 0);
        setPhase("done");
        toast.success(`Imported ${result.committed} transactions`);
      }
    });
  }

  // Pagination
  const includedRows = rows.filter((r) => r.included);
  const excludedRows = rows.filter((r) => !r.included);
  const needsCategory = includedRows.filter((r) => !r.categoryId).length;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // === UPLOAD PHASE ===
  if (phase === "upload") {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Import CSV Statement</h2>
        <Card>
          <CardHeader>
            <CardTitle>Upload a CSV file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV export from your bank or credit card company. Most
              common formats are detected automatically (Chase, Bank of America,
              and similar).
            </p>
            <div className="space-y-2">
              <Label className="text-sm">CSV File</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{file.name}</span>{" "}
                ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <Button
              onClick={handleParse}
              disabled={!file || parsing || isPending}
              className="gap-2"
            >
              <Upload className="size-4" />
              {parsing || isPending ? "Parsing..." : "Parse & Review"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === DONE PHASE ===
  if (phase === "done") {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Import Complete</h2>
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 text-green-600">
              <Check className="size-8" />
            </div>
            <p className="text-lg font-medium">
              Successfully imported {committedCount} transaction
              {committedCount !== 1 ? "s" : ""} from{" "}
              <span className="text-primary">{filename}</span>
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setPhase("upload");
                  setFile(null);
                  setRows([]);
                }}
              >
                Import Another
              </Button>
              <Button
                onClick={() => (window.location.href = "/dashboard/expenses")}
              >
                View Transactions
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === REVIEW PHASE ===
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold">Review Import</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {totalParsed} transactions parsed from{" "}
            <span className="font-medium text-foreground">{filename}</span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPhase("upload");
            setFile(null);
            setRows([]);
          }}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {includedRows.length}
            </p>
            <p className="text-sm text-muted-foreground">included</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {excludedRows.length}
            </p>
            <p className="text-sm text-muted-foreground">excluded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p
              className={`text-2xl font-bold ${needsCategory > 0 ? "text-amber-600" : "text-green-600"}`}
            >
              {needsCategory}
            </p>
            <p className="text-sm text-muted-foreground">need category</p>
          </CardContent>
        </Card>
      </div>

      {/* Review Table */}
      <Card>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium w-10">Inc.</th>
                  <th className="pb-2 font-medium w-28">Date</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium text-right w-24">Amount</th>
                  <th className="pb-2 font-medium w-52 pl-3">Category</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr
                    key={row.rowIndex}
                    className={`border-b last:border-0 ${
                      !row.included
                        ? "opacity-40"
                        : row.included && !row.categoryId
                          ? "bg-amber-50"
                          : ""
                    }`}
                  >
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={() => toggleRow(row.rowIndex)}
                        className="size-4 accent-primary"
                      />
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      {new Date(row.date + "T12:00:00").toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        }
                      )}
                    </td>
                    <td className="py-2">
                      <span className="line-clamp-1">{row.description}</span>
                      {row.isCredit && (
                        <span className="text-sm text-green-600 ml-1">
                          (credit)
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right font-medium whitespace-nowrap">
                      {formatAmount(row.amount)}
                    </td>
                    <td className="py-2 pl-3">
                      {row.included ? (
                        <Select
                          value={row.categoryId || undefined}
                          onValueChange={(val) =>
                            setRowCategory(row.rowIndex, val ?? "")
                          }
                        >
                          <SelectTrigger className="w-full h-8">
                            <SelectValue
                              placeholder="Select..."
                              displayValue={
                                row.categoryId
                                  ? getCategoryLabelById(row.categoryId)
                                  : undefined
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(grouped).map(([group, cats]) => (
                              <SelectGroup key={group}>
                                <SelectLabel>{group}</SelectLabel>
                                {cats.map((cat) => (
                                  <SelectItem
                                    key={cat.id}
                                    value={cat.id}
                                    label={categoryLabel(cat)}
                                  >
                                    {categoryLabel(cat)}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}&ndash;
                {Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="xs"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                )}
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
        </CardContent>
      </Card>

      {/* Commit Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm">
              Importing{" "}
              <span className="font-bold">{includedRows.length}</span> of{" "}
              {rows.length} transactions
              {needsCategory > 0 && (
                <span className="text-amber-600 ml-2">
                  ({needsCategory} still need a category)
                </span>
              )}
            </p>
            <Button
              onClick={handleCommit}
              disabled={
                includedRows.length === 0 || needsCategory > 0 || isPending
              }
              className="gap-2"
            >
              <Check className="size-4" />
              {isPending
                ? "Importing..."
                : `Commit ${includedRows.length} Transaction${includedRows.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
