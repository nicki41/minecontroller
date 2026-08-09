import { useState, type ReactElement } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ConfirmActionDialogProps {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  /** Shows an optional reason textarea, always available but never required, and passes its (trimmed, possibly empty) value to onConfirm. */
  showReason?: boolean;
  onConfirm: (reason?: string) => void;
}

/** Generic "confirm before you do this" wrapper — used for every player quick action except Message, which already opens its own compose box. */
export function ConfirmActionDialog({ trigger, title, description, confirmLabel, destructive, showReason, onConfirm }: ConfirmActionDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setReason("");
      }}
    >
      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {showReason && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-action-reason" className="text-xs text-muted-foreground">
              Reason (optional)
            </Label>
            <Textarea
              id="confirm-action-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Shown to the player, and kept in the ban history."
              className="resize-none text-sm"
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={() => onConfirm(showReason ? reason.trim() || undefined : undefined)}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
