import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function WizardProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, i) => {
        const state = i < current ? "done" : i === current ? "active" : "upcoming";
        return (
          <li key={step} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "active" && "bg-primary/15 text-primary ring-2 ring-primary",
                  state === "upcoming" && "bg-muted text-muted-foreground",
                )}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn("hidden text-xs font-medium sm:inline", state === "upcoming" ? "text-muted-foreground" : "text-foreground")}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && <div className={cn("h-px flex-1", state === "done" ? "bg-primary" : "bg-border")} />}
          </li>
        );
      })}
    </ol>
  );
}
