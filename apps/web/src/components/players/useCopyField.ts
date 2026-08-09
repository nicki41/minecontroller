import { useState } from "react";
import { toast } from "sonner";

/** Tracks which named field was just copied, for a brief check-mark swap on the trigger button. */
export function useCopyField() {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copy = async (field: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1200);
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };
  return { copiedField, copy };
}
