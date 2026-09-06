"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { buildAssignmentFieldConfig, submitBulkAssignmentAction } from "../../adapters/assignment";
import type { ActionSchema, OptionItem, RemoteOptionQuery, ResourceMeta } from "../../schema/types";
import type { ResourceRecord } from "../../types";
import { appMessage } from "../../adapters/lowcode-utils";
import { AssignmentPickerFieldControl } from "../fields/controls/AssignmentPickerFieldControl";
import { LHDrawerShell } from "./LHDrawerShell";

interface LHBulkAssignmentDrawerProps {
  resource: ResourceMeta;
  action: ActionSchema;
  records: ResourceRecord[];
  open: boolean;
  onClose: () => void;
  onSubmitted: (result: { failedUserIds: Array<string | number> }) => Promise<void>;
  loadRemoteOptions: (source: string, query?: string | RemoteOptionQuery) => Promise<OptionItem[]>;
}

function formatUserRoles(record: ResourceRecord): string {
  const roles = record.roles;
  if (!Array.isArray(roles) || roles.length === 0) {
    return "暂无角色";
  }
  return roles.map((role) => String(role)).join("、");
}

interface BulkAssignmentSnapshot {
  action: ActionSchema;
  records: ResourceRecord[];
}

export function LHBulkAssignmentDrawer({
  resource,
  action,
  records,
  open,
  onClose,
  onSubmitted,
  loadRemoteOptions,
}: LHBulkAssignmentDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [snapshot, setSnapshot] = useState<BulkAssignmentSnapshot | null>(null);
  const activeAction = open && records.length > 0 ? action : (snapshot?.action ?? action);
  const displayRecords = records.length > 0 ? records : (snapshot?.records ?? []);
  const assignment = activeAction.assignment;
  const bulkApi = activeAction.bulkApi;
  const payloadKey = assignment?.payloadKey;

  useEffect(() => {
    if (open && records.length > 0) {
      setSnapshot({ action, records });
    }
  }, [open, action, records]);

  useEffect(() => {
    if (open) {
      setRoleIds([]);
    }
  }, [open, action.key, records]);

  const fieldConfig = useMemo(
    () => (assignment ? buildAssignmentFieldConfig(assignment) : null),
    [assignment],
  );

  if (!assignment || !bulkApi || !payloadKey || !fieldConfig) {
    return null;
  }

  const ensuredBulkApi = bulkApi;
  const ensuredPayloadKey = payloadKey;
  const drawerWidth =
    assignment.width === "sm" || assignment.width === "md" || assignment.width === "lg"
      ? assignment.width
      : "lg";
  const title = activeAction.label || assignment.title || "批量分配";
  const description =
    assignment.description ??
    "为选中对象统一设置授权。保存后将覆盖各对象现有配置。";

  async function handleSubmit() {
    if (roleIds.length === 0) {
      appMessage.info("请至少选择一个角色");
      return;
    }

    setSubmitting(true);
    try {
      const userIds = displayRecords.map((record) => record[resource.idKey] as string | number);
      const result = await submitBulkAssignmentAction(ensuredBulkApi, userIds, ensuredPayloadKey, roleIds);
      if (result.failureCount > 0) {
        appMessage.info(`已成功 ${result.successCount} 人，失败 ${result.failureCount} 人`);
      } else {
        appMessage.success(`${title}已完成`);
      }
      const failedUserIds = result.failures.map((item) => item.userId);
      await onSubmitted({ failedUserIds });
      onClose();
    } catch (error) {
      appMessage.errorFrom(error, `${title}失败`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LHDrawerShell
      open={open}
      onClose={onClose}
      width={drawerWidth}
      title={title}
      description={description}
      footer={(
        <>
          <Button type="button" variant="outline" className="lh-drawer-footer-button" onClick={onClose}>
            取消
          </Button>
          <Button
            type="button"
            className="lh-drawer-footer-button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
          >
            {submitting ? "保存中..." : "保存授权"}
          </Button>
        </>
      )}
    >
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <section className="lh-bulk-assignment-targets">
          <div className="lh-bulk-assignment-targets-header">
            <h3>选中用户</h3>
            <p>共 {displayRecords.length} 人，保存后将统一覆盖为相同角色。</p>
          </div>
          <ul className="lh-bulk-assignment-target-list">
            {displayRecords.map((record) => (
              <li className="lh-bulk-assignment-target-item" key={String(record[resource.idKey])}>
                <div className="lh-bulk-assignment-target-main">
                  <strong>{String(record.displayName ?? record.username ?? record[resource.idKey])}</strong>
                  <span>{String(record.username ?? "-")}</span>
                </div>
                <Badge variant="secondary" className="lh-bulk-assignment-target-roles">
                  {formatUserRoles(record)}
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <section className="lh-bulk-assignment-picker">
          <div className="lh-form-section">
            <h3>{assignment.fieldLabel ?? "角色"}</h3>
            <p>勾选后将应用到上方全部用户，不会保留各用户原有差异角色。</p>
          </div>
          <AssignmentPickerFieldControl
            field={{
              key: payloadKey,
              path: payloadKey,
              label: assignment.fieldLabel ?? "角色",
              component: "assignmentPicker",
            }}
            config={fieldConfig}
            assignedApi={assignment.assignedApi ?? activeAction.api ?? ""}
            recordId={displayRecords[0]?.[resource.idKey] as string | number}
            resource={resource}
            value={roleIds}
            skipAssignedLoad
            loadRemoteOptions={loadRemoteOptions}
            onChange={setRoleIds}
          />
        </section>
      </div>
    </LHDrawerShell>
  );
}
