import { useEffect, useId, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import type { OptionItem, RemoteOptionQuery, ResourceMeta } from "../../schema/types";
import type { AuthenticatedUser } from "../../lib/types";
import { LHResourceForm } from "../forms/LHResourceForm";
import { LHDrawerLoading } from "./LHDrawerLoading";
import { LHDrawerShell, resolveResourceDrawerWidth } from "./LHDrawerShell";

interface FormDrawerProps {
  resource: ResourceMeta;
  mode: "create" | "edit";
  open: boolean;
  loading?: boolean;
  values: Record<string, unknown>;
  currentUser?: AuthenticatedUser | null;
  formContext?: import("../forms/LHResourceForm").ResourceFormContext;
  useCustomCreateTitle?: boolean;
  prepend?: ReactNode;
  onChange: (key: string, value: unknown) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
}

function titleForMode(resource: ResourceMeta, mode: "create" | "edit", useCustomCreateTitle: boolean): string {
  if (mode === "create" && useCustomCreateTitle && resource.form.title) {
    return resource.form.title;
  }
  if (mode === "create") {
    return `新建${resource.label}`;
  }
  return `编辑${resource.label}`;
}

export function LHFormDrawer({
  resource,
  mode,
  open,
  loading = false,
  values,
  currentUser = null,
  onChange,
  onClose,
  onSubmit,
  loadRemoteOptions,
  formContext,
  useCustomCreateTitle = false,
  prepend = null,
}: FormDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [displayMode, setDisplayMode] = useState(mode);
  const formId = `lh-resource-form-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (open) {
      setDisplayMode(mode);
    }
  }, [mode, open]);

  async function handleValidatedSubmit() {
    setSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LHDrawerShell
      open={open}
      onClose={onClose}
      width={resolveResourceDrawerWidth(resource)}
      title={titleForMode(resource, displayMode, useCustomCreateTitle)}
      description={resource.form.description ?? `${resource.label}配置面板`}
      footer={resource.form.actions.map((action) => {
        const isSubmit = action.kind === "submit" || action.key === "submit";
        return (
          <Button
            key={action.key}
            form={isSubmit ? formId : undefined}
            type={isSubmit ? "submit" : "button"}
            variant={isSubmit ? "default" : "outline"}
            className="lh-drawer-footer-button"
            onClick={isSubmit ? undefined : onClose}
            disabled={(isSubmit && submitting) || (isSubmit && loading)}
          >
            {isSubmit && submitting ? "保存中..." : action.label}
          </Button>
        );
      })}
    >
      {loading ? (
        <LHDrawerLoading message={displayMode === "edit" ? "正在加载编辑数据..." : "正在加载..."} />
      ) : (
        <>
          {prepend}
          <LHResourceForm
          resource={resource}
          mode={displayMode}
          values={values}
          currentUser={currentUser}
          formId={formId}
          formContext={formContext}
          onChange={onChange}
          onSubmit={handleValidatedSubmit}
          loadRemoteOptions={loadRemoteOptions}
        />
        </>
      )}
    </LHDrawerShell>
  );
}
