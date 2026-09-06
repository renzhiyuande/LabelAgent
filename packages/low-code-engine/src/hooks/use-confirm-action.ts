import { useMemo, useState } from "react";
import type { ActionSchema, HeaderActionSchema } from "../schema/types";
import type { ResourceRecord } from "../types";

interface ConfirmState {
  title: string;
  description?: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  onConfirm: () => Promise<void>;
}

function interpolate(template: string | undefined, record?: ResourceRecord): string | undefined {
  return template?.replace(/\{(\w+)\}/g, (_, key: string) => String(record?.[key] ?? ""));
}

export function useConfirmAction() {
  const [pending, setPending] = useState<ConfirmState | null>(null);
  const [loading, setLoading] = useState(false);

  async function openOrRunAction(
    action: ActionSchema | HeaderActionSchema,
    execute: () => Promise<void>,
    record?: ResourceRecord,
  ) {
    const isDangerKind = action.kind === "danger";
    const hasExplicitConfirm = !!action.confirm?.title;
    
    if (!hasExplicitConfirm && !isDangerKind) {
      await execute();
      return;
    }

    setPending({
      title: interpolate(action.confirm?.title, record) ?? `确认要${action.label}吗？`,
      description: interpolate(action.confirm?.description, record) ?? action.confirm?.description,
      confirmText: action.confirm?.confirmText ?? (isDangerKind ? `确认${action.label}` : "确认"),
      cancelText: action.confirm?.cancelText ?? "取消",
      danger: isDangerKind,
      onConfirm: async () => {
        setLoading(true);
        try {
          await execute();
          setPending(null);
        } finally {
          setLoading(false);
        }
      },
    });
  }

  const dialogProps = useMemo(
    () => ({
      open: Boolean(pending),
      title: pending?.title ?? "",
      description: pending?.description,
      confirmText: pending?.confirmText,
      cancelText: pending?.cancelText,
      danger: pending?.danger ?? false,
      loading,
      onClose: () => {
        if (loading) {
          return;
        }
        setPending(null);
      },
      onConfirm: async () => {
        await pending?.onConfirm();
      },
    }),
    [loading, pending],
  );

  return {
    dialogProps,
    openOrRunAction,
  };
}
