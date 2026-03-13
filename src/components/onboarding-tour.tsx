"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TourStep {
  target: string | null;
  title: string;
  content: string;
  position: "center" | "bottom" | "top";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: "Welcome to Budget Tracker!",
    content:
      "Let's take a quick tour to help you get started. This will only take a moment.",
    position: "center",
  },
  {
    target: '[data-tour="summary-cards"]',
    title: "Monthly Overview",
    content:
      "These cards show your income, spending, and net balance for the current month at a glance.",
    position: "bottom",
  },
  {
    target: '[data-tour="quick-actions"]',
    title: "Quick Actions",
    content:
      "Use these shortcuts to add transactions, view your budget, or jump to any feature.",
    position: "bottom",
  },
  {
    target: '[data-tour="nav"]',
    title: "Navigation",
    content:
      "This bar lets you move between all sections — transactions, budgets, charts, CSV import, and more.",
    position: "bottom",
  },
  {
    target: '[data-tour="add-transaction"]',
    title: "Add Your First Transaction",
    content:
      "Ready to go? Click here to add your first transaction and start tracking your budget!",
    position: "bottom",
  },
];

const STORAGE_KEY = "budget-tracker-tour-complete";

export function OnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>(
    {}
  );

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  const positionTooltip = useCallback(() => {
    const step = TOUR_STEPS[currentStep];
    if (!step.target || step.position === "center") {
      setSpotlightStyle({ display: "none" });
      setTooltipStyle({
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      });
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pad = 8;

    setSpotlightStyle({
      position: "fixed",
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
      borderRadius: 8,
    });

    const tooltipWidth = 340;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));

    if (step.position === "bottom") {
      setTooltipStyle({
        position: "fixed",
        top: rect.bottom + pad + 12,
        left,
        width: tooltipWidth,
      });
    } else {
      setTooltipStyle({
        position: "fixed",
        top: rect.top - pad - 12,
        left,
        width: tooltipWidth,
        transform: "translateY(-100%)",
      });
    }
  }, [currentStep]);

  useEffect(() => {
    if (!visible) return;
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
    };
  }, [visible, positionTooltip]);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "true");
    setVisible(false);
  }

  function next() {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={finish} />

      {/* Spotlight cutout */}
      <div
        style={spotlightStyle}
        className="absolute z-[51] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] bg-transparent pointer-events-none"
      />

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className="z-[52] bg-background border rounded-lg shadow-lg p-4"
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-base">{step.title}</h3>
          <button
            onClick={finish}
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 p-1"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{step.content}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {TOUR_STEPS.length}
          </span>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={prev}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {isLast ? "Get Started" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
