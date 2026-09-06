"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { LHAssignmentWorkspace } from "../assignment";
import type { ActionSchema, OptionItem, RemoteOptionQuery, ResourceMeta } from "../../schema/types";
import type { ResourceRecord } from "../../types";
import { appMessage } from "../../adapters/lowcode-utils";
import { submitAssignmentAction } from "../../adapters/assignment";
import { buildAssignmentFormResource } from "../../utils/build-assignment-form";
import { LHResourceForm } from "../forms/LHResourceForm";
import { LHDrawerShell } from "./LHDrawerShell";
import { setValueAtPath } from "../../utils/object-path";

interface LHAssignmentDrawerProps {
  resource: ResourceMeta;
  action: ActionSchema;
  record: ResourceRecord | null;
  open: boolean;
  onClose: () => void;
  onSubmitted: () => Promise<void>;
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
}

interface AssignmentSnapshot {
  action: ActionSchema;
  record: ResourceRecord;
}

export function LHAssignmentDrawer({
  resource,
  action,
  record,
  open,
  onClose,
  onSubmitted,
  loadRemoteOptions,
}: LHAssignmentDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [snapshot, setSnapshot] = useState<AssignmentSnapshot | null>(null);
  const formId = `lh-assignment-form-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (open && record) {
      setSnapshot({ action, record });
    }
  }, [open, action, record]);

  const activeAction = open && record ? action : (snapshot?.action ?? action);
  const activeRecord = record ?? snapshot?.record ?? null;
  const assignmentResource = useMemo(
    () => buildAssignmentFormResource(resource, activeAction),
    [activeAction, resource],
  );
  const assignment = activeAction.assignment;
  const submitApi = activeAction.api;
  const payloadKey = assignment?.payloadKey;

  useEffect(() => {
    if (!open || !payloadKey) {
      return;
    }
    setValues({ [payloadKey]: [] });
  }, [open, payloadKey, activeRecord?.[resource.idKey]]);

  if (!assignmentResource || !assignment || !submitApi || !activeRecord || !payloadKey) {
    return null;
  }

  const resolvedRecord = activeRecord;
  const drawerWidth = typeof assignmentResource.form.width === "string" ? assignmentResource.form.width : "lg";
  const activeAssignment = assignment;
  const activeSubmitApi = submitApi;
  const activePayloadKey = payloadKey;

  async function handleSubmit() {
    const selectedIds = Array.isArray(values[activePayloadKey]) ? (values[activePayloadKey] as number[]) : [];
    setSubmitting(true);
    try {
      await appMessage.promise(
        submitAssignmentAction(
          resource,
          activeSubmitApi,
          activePayloadKey,
          resolvedRecord[resource.idKey] as string | number,
          selectedIds,
        ),
        {
          loading: `${activeAssignment.title ?? activeAction.label}保存中...`,
          success: `${activeAssignment.title ?? activeAction.label}已更新`,
          error: `${activeAssignment.title ?? activeAction.label}失败`,
        },
      );
      await onSubmitted();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LHDrawerShell
      open={open}
      onClose={onClose}
      width={drawerWidth}
      title={activeAssignment.title ?? activeAction.label}
      description={activeAssignment.description}
      footer={assignmentResource.form.actions.map((footerAction) => {
        const isSubmit = footerAction.kind === "submit" || footerAction.key === "submit";
        return (
          <Button
            key={footerAction.key}
            form={isSubmit ? formId : undefined}
            type={isSubmit ? "submit" : "button"}
            variant={isSubmit ? "default" : "outline"}
            className="lh-drawer-footer-button"
            onClick={isSubmit ? undefined : onClose}
            disabled={isSubmit && submitting}
          >
            {isSubmit && submitting ? "保存中..." : footerAction.label}
          </Button>
        );
      })}
    >
      <LHAssignmentWorkspace
        record={resolvedRecord}
        summary={activeAssignment.summary}
        targetTitle={activeAssignment.targetTitle}
        targetDescription={activeAssignment.targetDescription}
      >
        <LHResourceForm
          resource={assignmentResource}
          mode="assignment"
          values={values}
          formId={formId}
          formContext={{
            recordId: resolvedRecord[resource.idKey] as string | number,
            assignmentAction: activeAction,
          }}
          onChange={(key, value) => {
            setValues((current) => setValueAtPath(current, key, value));
          }}
          onSubmit={handleSubmit}
          loadRemoteOptions={loadRemoteOptions}
        />
      </LHAssignmentWorkspace>
    </LHDrawerShell>
  );
}
