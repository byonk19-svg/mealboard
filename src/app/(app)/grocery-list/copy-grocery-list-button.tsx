"use client";

import { useState } from "react";

type CopyGroceryListButtonProps = {
  copyText: string;
  disabled: boolean;
};

export function CopyGroceryListButton({
  copyText,
  disabled
}: CopyGroceryListButtonProps) {
  const [backupVisible, setBackupVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function copyList() {
    if (disabled) {
      return;
    }

    try {
      await navigator.clipboard.writeText(copyText);
      setStatusMessage("Copied grocery list.");
    } catch {
      setStatusMessage("Copy failed. Select and copy the list manually.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          className="min-h-12 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={copyList}
          type="button"
        >
          Copy list
        </button>
        <button
          className="min-h-12 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => setBackupVisible((visible) => !visible)}
          type="button"
        >
          {backupVisible ? "Hide emergency backup" : "Show emergency backup"}
        </button>
      </div>
      {statusMessage ? (
        <p className="text-xs text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}
      {backupVisible ? (
        <label className="block text-xs font-medium text-muted-foreground">
          Emergency grocery backup
          <textarea
            className="mt-2 min-h-40 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
            readOnly
            value={copyText}
          />
        </label>
      ) : null}
    </div>
  );
}
