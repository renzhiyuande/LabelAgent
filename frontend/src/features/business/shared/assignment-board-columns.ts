import type { TableColumnSchema } from "@/low-code/schema/types";

/** 分配管理侧栏题目池列表（全量列） */
export const ASSIGNMENT_BOARD_TABLE_COLUMNS: TableColumnSchema[] = [
  { key: "seqNo", title: "序号", type: "number", sortable: true },
  {
    key: "sourceItemKey",
    title: "源数据标识",
    type: "link",
    link: { action: "detail" },
  },
  { key: "payloadPreview", title: "业务数据", type: "text", formatter: "payloadPreview" },
  { key: "assignable", title: "可指派", type: "text", formatter: "boolean" },
  { key: "assignmentStatus", title: "分配状态", type: "text", dict: "assignment_status" },
  {
    key: "labelerDisplayName",
    title: "标注员",
    type: "user",
    user: { idField: "labelerId", nameField: "labelerDisplayName", role: "LABELER" },
  },
  { key: "assignType", title: "分配类型", type: "text", dict: "assignment_type" },
  { key: "claimedAt", title: "认领时间", type: "datetime" },
  { key: "deadlineAt", title: "截止时间", type: "datetime" },
];

/** 批量指派 Drawer 内 dynamicTable（仅选题所需列） */
export const ASSIGNMENT_BOARD_BATCH_ASSIGN_COLUMNS: TableColumnSchema[] = [
  { key: "seqNo", title: "序号", type: "number", sortable: true },
  {
    key: "sourceItemKey",
    title: "源数据标识",
    type: "link",
    link: { action: "detail" },
  },
  { key: "payloadPreview", title: "业务数据", type: "text", formatter: "payloadPreview" },
];
