"use client";

import { useRef, useState, useTransition } from "react";
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
import { Camera, Check, ChevronLeft, Loader2 } from "lucide-react";
import { createExpense } from "../actions";

type CategoryOption = {
  id: string;
  label: string;
  type: string;
};

type ReceiptData = {
  merchant: string;
  amount: number;
  date: string;
  items: string;
  suggestedCategoryId: string | null;
  categories: CategoryOption[];
};

const typeLabels: Record<string, string> = {
  income: "Income",
  fixed: "Fixed Expenses",
  variable: "Variable Expenses",
  tax: "Taxes",
  savings: "Savings",
};

export default function ReceiptPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // Phase: upload → review → done
  const [phase, setPhase] = useState<"upload" | "review" | "done">("upload");

  // Upload phase
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

  // Review phase
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
  }

  async function handleScan() {
    if (!file) return;
    setScanning(true);

    try {
      const formData = new FormData();
      formData.set("receipt", file);

      const res = await fetch("/api/receipt", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to scan receipt");
        setScanning(false);
        return;
      }

      setReceiptData(data);
      setDescription(data.merchant || "");
      setAmount(String(data.amount || ""));
      setDate(data.date || "");
      setCategory(data.suggestedCategoryId || "");
      setPhase("review");
    } catch {
      toast.error("Failed to scan receipt. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  function handleSave() {
    if (!category) {
      toast.error("Please select a category");
      return;
    }

    const formData = new FormData();
    formData.set("amount", amount);
    formData.set("categoryId", category);
    formData.set("date", date);
    formData.set("description", description);

    startTransition(async () => {
      const result = await createExpense(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Transaction saved from receipt!");
        setPhase("done");
      }
    });
  }

  // Group categories by type for the dropdown
  const groupedCategories = (receiptData?.categories || []).reduce(
    (acc, cat) => {
      const group = typeLabels[cat.type] || cat.type;
      if (!acc[group]) acc[group] = [];
      acc[group].push(cat);
      return acc;
    },
    {} as Record<string, CategoryOption[]>
  );

  function getCategoryLabel(id: string) {
    const cat = receiptData?.categories.find((c) => c.id === id);
    return cat ? cat.label : "";
  }

  // === UPLOAD PHASE ===
  if (phase === "upload") {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Scan Receipt</h2>
        <Card>
          <CardHeader>
            <CardTitle>Upload a receipt photo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Take a photo of your receipt or upload an image. We&apos;ll extract
              the merchant, amount, date, and items automatically.
            </p>
            <div className="space-y-2">
              <Label className="text-sm">Receipt Image</Label>
              <Input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
            {file && (
              <p className="text-sm text-muted-foreground">
                Selected:{" "}
                <span className="font-medium text-foreground">{file.name}</span>{" "}
                ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
            <Button
              onClick={handleScan}
              disabled={!file || scanning}
              className="gap-2"
            >
              {scanning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="size-4" />
                  Scan Receipt
                </>
              )}
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
        <h2 className="text-3xl font-bold">Receipt Saved</h2>
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 text-green-600">
              <Check className="size-8" />
            </div>
            <p className="text-lg font-medium">
              Transaction saved from receipt!
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setPhase("upload");
                  setFile(null);
                  setReceiptData(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                Scan Another
              </Button>
              <Button
                nativeButton={false}
                render={<Link href="/dashboard/expenses" />}
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
          <h2 className="text-3xl font-bold">Review Receipt</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Verify the extracted details and adjust if needed.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setPhase("upload");
            setFile(null);
            setReceiptData(null);
            if (fileRef.current) fileRef.current.value = "";
          }}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
      </div>

      {receiptData?.items && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Items:</span>{" "}
              {receiptData.items}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description (merchant)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Store name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                $
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="pl-8 text-lg h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder="Select a category"
                  displayValue={
                    category ? getCategoryLabel(category) : undefined
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedCategories).map(([group, cats]) => (
                  <SelectGroup key={group}>
                    <SelectLabel>{group}</SelectLabel>
                    {cats.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} label={cat.label}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={!amount || !category || !date || isPending}
              className="gap-2"
            >
              <Check className="size-4" />
              {isPending ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
