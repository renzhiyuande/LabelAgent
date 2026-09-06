"use client";

import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import type { OptionItem, PromptFormSchema, RemoteOptionQuery } from "../../schema/types";
import { LHPromptForm } from "../forms/LHPromptForm";

interface LHPromptDialogProps {
  open: boolean;
  closing?: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  submitting?: boolean;
  formId: string;
  schema: PromptFormSchema | null;
  values: Record<string, unknown>;
  fieldErrors?: Record<string, string>;
  onFieldErrorsChange?: (errors: Record<string, string>) => void;
  onChange: (key: string, value: unknown) => void;
  onSubmit: () => Promise<void>;
  onClose: () => void;
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
}

export function LHPromptDialog({
  open,
  closing = false,
  title,
  description,
  confirmLabel = "确认",
  cancelLabel = "取消",
  submitting = false,
  formId,
  schema,
  values,
  fieldErrors,
  onFieldErrorsChange,
  onChange,
  onSubmit,
  onClose,
  loadRemoteOptions,
}: LHPromptDialogProps) {
  if (!schema && !open && !closing) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) {
          onClose();
        }
      }}
    >
      <DialogContent className={`lh-prompt-dialog max-w-md gap-4 p-0 ${closing ? "lh-prompt-dialog--closing" : ""}`}>
        <DialogHeader className="lh-prompt-dialog-header">
          <DialogTitle className="lh-prompt-dialog-title">{title}</DialogTitle>
          {description ? <DialogDescription className="lh-prompt-dialog-description">{description}</DialogDescription> : null}
        </DialogHeader>
        {schema ? (
          <LHPromptForm
            schema={schema}
            formId={formId}
            values={values}
            fieldErrors={fieldErrors}
            onChange={onChange}
            onSubmit={onSubmit}
            onFieldErrorsChange={onFieldErrorsChange}
            loadRemoteOptions={loadRemoteOptions}
          />
        ) : null}
        <DialogFooter className="lh-prompt-dialog-footer">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            {cancelLabel}
          </Button>
          <Button type="submit" form={formId} disabled={submitting || !schema}>
            {submitting ? "处理中..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
