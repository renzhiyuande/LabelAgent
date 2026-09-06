"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { OptionItem, PromptFormSchema, RemoteOptionQuery } from "../schema/types";
import { setValueAtPath } from "../utils/object-path";
import { assertPromptFormSchema } from "../utils/prompt-form-allowlist";
import { buildPromptInitialValues } from "../utils/prompt-form-utils";

interface PendingPrompt {
  schema: PromptFormSchema;
  resolve: (values: Record<string, unknown> | null) => void;
  loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
}

const noopLoadRemoteOptions = async () => [] as OptionItem[];
const PROMPT_DIALOG_CLOSE_MS = 100;

export function usePromptForm() {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const [renderedPending, setRenderedPending] = useState<PendingPrompt | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);
  const valuesRef = useRef(values);
  const closingResultRef = useRef<Record<string, unknown> | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const formId = `lh-prompt-form-${useId().replace(/:/g, "")}`;

  valuesRef.current = values;

  useEffect(() => () => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  const close = useCallback((result: Record<string, unknown> | null) => {
    if (!renderedPending || closing) {
      return;
    }
    closingResultRef.current = result;
    setClosing(true);
    setPending(null);
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      const nextResult = closingResultRef.current;
      closingResultRef.current = null;
      closeTimerRef.current = null;
      renderedPending.resolve(nextResult);
      setRenderedPending(null);
      setClosing(false);
      setSubmitting(false);
      setFieldErrors({});
    }, PROMPT_DIALOG_CLOSE_MS);
  }, [closing, renderedPending]);

  const open = useCallback(
    (
      schema: PromptFormSchema,
      loadRemoteOptions?: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>,
    ): Promise<Record<string, unknown> | null> => {
      assertPromptFormSchema(schema);
      return new Promise((resolve) => {
        if (closeTimerRef.current != null) {
          window.clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        closingResultRef.current = null;
        setClosing(false);
        setValues(buildPromptInitialValues(schema));
        setFieldErrors({});
        setSubmitting(false);
        const nextPending = {
          schema,
          resolve,
          loadRemoteOptions,
        };
        setPending(nextPending);
        setRenderedPending(nextPending);
      });
    },
    [],
  );

  const handleChange = useCallback((key: string, value: unknown) => {
    setValues((current) => setValueAtPath(current, key, value));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      close({ ...valuesRef.current });
    } finally {
      setSubmitting(false);
    }
  }, [close]);

  const handleClose = useCallback(() => {
    if (submitting) {
      return;
    }
    close(null);
  }, [close, submitting]);

  const dialogProps = useMemo(
    () => ({
      open: Boolean(pending),
      closing,
      title: renderedPending?.schema.title ?? "",
      description: renderedPending?.schema.description,
      confirmLabel: renderedPending?.schema.confirmLabel ?? "确认",
      cancelLabel: renderedPending?.schema.cancelLabel ?? "取消",
      submitting,
      formId,
      schema: renderedPending?.schema ?? null,
      values,
      fieldErrors,
      onFieldErrorsChange: setFieldErrors,
      onChange: handleChange,
      onSubmit: handleSubmit,
      onClose: handleClose,
      loadRemoteOptions: renderedPending?.loadRemoteOptions ?? noopLoadRemoteOptions,
    }),
    [closing, fieldErrors, formId, handleChange, handleClose, handleSubmit, pending, renderedPending, submitting, values],
  );

  return {
    open,
    close,
    dialogProps,
  };
}
