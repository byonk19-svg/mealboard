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
      <button
        className="min-h-12 rounded-md border border-border bg-card px-4 py-3 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={copyList}
        type="button"
      >
        Copy list
      </button>
      {statusMessage ? (
        <p className="text-xs text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
