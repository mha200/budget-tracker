"use client";

import { useRef, useState, useEffect, useTransition } from "react";
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
import { createExpense, getCategories } from "../actions";
import { DescriptionAutocomplete } from "@/components/description-autocomplete";

type Category = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  children?: Category[];
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const typeLabels: Record<string, string> = {
  income: "Income",
  fixed: "Fixed Expenses",
  variable: "Variable Expenses",
  tax: "Taxes",
  savings: "Savings",
};

export default function NewExpensePage() {
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  // Group leaf categories by type, with parent prefix
  const grouped = categories.reduce(
    (acc, cat) => {
      // Skip parent categories (ones that have children)
      const hasChildren = categories.some((c) => c.parentId === cat.id);
      if (hasChildren) return acc;
      const group = typeLabels[cat.type] || cat.type;
      if (!acc[group]) acc[group] = [];
      acc[group].push(cat);
      return acc;
    },
    {} as Record<string, Category[]>
  );

  function getCategoryLabel(id: string) {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return "";
    return cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name;
  }

  function handleSuggestionSelect(suggestion: {
    description: string | null;
    amount: number;
    categoryId: string;
  }) {
    setAmount(String(suggestion.amount));
    setSelectedCategory(suggestion.categoryId);
    // Focus amount so user can confirm or adjust
    amountRef.current?.focus();
  }

  function handleSubmit(formData: FormData) {
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }
    formData.set("categoryId", selectedCategory);

    startTransition(async () => {
      const result = await createExpense(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Transaction added!");
        formRef.current?.reset();
        setSelectedCategory("");
        setDescription("");
        setAmount("");
      }
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-4xl animate-fade-up stagger-1">Add Transaction</h2>
      <Card>
        <CardHeader>
          <CardTitle>Quick Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <DescriptionAutocomplete
                value={description}
                onChange={setDescription}
                onSelect={handleSuggestionSelect}
                autoFocus
              />
              <input type="hidden" name="description" value={description} />
              <p className="text-xs text-muted-foreground">
                Start typing to see matching past transactions
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  $
                </span>
                <Input
                  ref={amountRef}
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-lg h-12"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={(val) => setSelectedCategory(val ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a category" displayValue={selectedCategory ? getCategoryLabel(selectedCategory) : undefined} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(grouped).map(([group, cats]) => (
                    <SelectGroup key={group}>
                      <SelectLabel>{group}</SelectLabel>
                      {cats.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} label={cat.parent ? `${cat.parent.name} > ${cat.name}` : cat.name}>
                          {cat.parent
                            ? `${cat.parent.name} > ${cat.name}`
                            : cat.name}
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
                name="date"
                type="date"
                defaultValue={formatDate(new Date())}
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Add Transaction"}
              </Button>
              <Button
                type="button"
                variant="outline"
                nativeButton={false}
                render={<Link href="/dashboard/expenses" />}
              >
                View Transactions
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
