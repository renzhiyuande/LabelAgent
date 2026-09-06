"use client";

import { useEffect } from "react";
import { LHPromptDialog } from "./LHPromptDialog";
import { usePromptForm } from "../../hooks/use-prompt-form";
import { registerPromptFormOpener } from "../../utils/prompt-form-bridge";

export function LHPromptFormHost() {
  const promptForm = usePromptForm();

  useEffect(() => {
    registerPromptFormOpener(promptForm.open);
    return () => registerPromptFormOpener(null);
  }, [promptForm.open]);

  return <LHPromptDialog {...promptForm.dialogProps} />;
}
