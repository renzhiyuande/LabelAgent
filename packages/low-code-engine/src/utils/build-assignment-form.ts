import type { ActionSchema, AssignmentActionMeta, FormFieldSchema, ResourceMeta } from "../schema/types";
import { buildAssignmentFieldConfig } from "../adapters/assignment";

export function buildAssignmentFormResource(
  resource: ResourceMeta,
  action: ActionSchema,
): ResourceMeta | null {
  if (!action.assignment || !action.api) {
    return null;
  }

  const assignment: AssignmentActionMeta = action.assignment;
  const fieldKey = assignment.payloadKey;
  const field: FormFieldSchema = {
    key: fieldKey,
    path: fieldKey,
    label: assignment.fieldLabel ?? action.label,
    component: "assignmentPicker",
    span: 24,
    assignment: buildAssignmentFieldConfig(assignment),
  };

  return {
    ...resource,
    form: {
      title: assignment.title ?? action.label,
      width: assignment.width ?? "lg",
      sections: [
        {
          key: "assignment",
          title: "可分配项",
          description: "勾选后保存即可生效，支持回显当前已分配内容。",
          fields: [field],
        },
      ],
      actions: [
        { key: "cancel", label: "取消" },
        { key: "submit", label: "保存授权", kind: "submit" },
      ],
    },
  };
}

export function resolveAssignmentApis(action: ActionSchema) {
  const assignment = action.assignment;
  if (!assignment || !action.api) {
    return null;
  }
  return {
    submitApi: action.api,
    assignedApi: assignment.assignedApi ?? action.api,
    payloadKey: assignment.payloadKey,
    fieldConfig: buildAssignmentFieldConfig(assignment),
  };
}
