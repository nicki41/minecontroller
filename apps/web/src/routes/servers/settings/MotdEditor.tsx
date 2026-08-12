import { useRef } from "react";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { MotdHelp } from "./MotdHelp";

export function MotdEditor({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function insert(code: string) {
    const el = inputRef.current;
    if (!el) {
      onChange(value + code);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + code + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + code.length;
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="space-y-2">
      <FormField label="MOTD" htmlFor="motd" hint="Message shown for this server in the multiplayer server list.">
        <Input id="motd" ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
      </FormField>
      {!disabled && <MotdHelp onInsert={insert} />}
    </div>
  );
}
