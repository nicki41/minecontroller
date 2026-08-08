import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface RestartConfirmDialogProps {
  open: boolean;
  saving: boolean;
  onRestartNow: () => void;
  onSaveLater: () => void;
  onCancel: () => void;
}

/** Shared across Settings tabs — see useRestartAwareSettings for when this opens. */
export function RestartConfirmDialog({ open, saving, onRestartNow, onSaveLater, onCancel }: RestartConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Diese Änderungen erfordern einen Neustart des Servers.</AlertDialogTitle>
          <AlertDialogDescription>
            Der Server läuft gerade. Diese Einstellungen wirken sich erst nach einem Neustart aus — Spieler auf dem
            Server werden dabei kurzzeitig getrennt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={saving}>
            Abbrechen
          </AlertDialogCancel>
          <Button variant="outline" onClick={onSaveLater} disabled={saving}>
            Später neu starten
          </Button>
          <AlertDialogAction onClick={onRestartNow} disabled={saving}>
            Jetzt neu starten
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
