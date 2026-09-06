import { normalizeSnowflakeId } from "@/low-code/lib/id-utils";
import type { ResourceMeta } from "@/low-code/schema/types";

const MEMBER_ROLE_OPTIONS = [
  { label: "审核员", value: "REVIEWER" },
  { label: "标注员", value: "LABELER" },
  { label: "查看者", value: "VIEWER" },
] as const;

const MEMBER_ROLE_TABLE_ENUM = MEMBER_ROLE_OPTIONS.map((option) => ({
  label: option.label,
  value: option.value,
  tone: option.value === "REVIEWER" ? "primary" : option.value === "LABELER" ? "success" : "neutral",
}));

export const taskMembersResource: ResourceMeta = {
  resource: "taskMembers",
  label: "任务成员",
  idKey: "id",
  permissions: {
    page: ["system:admin", "business:task:read"],
    create: ["system:admin", "business:task:update"],
    delete: ["system:admin", "business:task:update"],
  },
  capabilities: {
    query: true,
    create: true,
    delete: true,
    edit: false,
    detail: false,
  },
  normalizeRecord: (record) => ({
    ...record,
    id: normalizeSnowflakeId(record.id) ?? record.id,
    taskId: normalizeSnowflakeId(record.taskId) ?? record.taskId,
    userId: normalizeSnowflakeId(record.userId) ?? record.userId,
  }),
  prepareValues: (values) => ({
    taskId: values.taskId,
    userId: values.userId,
    memberRole: values.memberRole ?? "REVIEWER",
  }),
  api: {
    query: "/api/v1/owner/task-members",
    detail: "/api/v1/owner/task-members/{id}",
    create: "/api/v1/owner/task-members",
    createViaQuery: true,
    delete: "/api/v1/owner/task-members/{id}",
    options: {
      collaborators: "/api/v1/business/options/collaborators",
    },
  },
  table: {
    pagination: true,
    columns: [
      {
        key: "userName",
        title: "用户",
        type: "user",
        user: { idField: "userId", nameField: "userName" },
      },
      {
        key: "memberRole",
        title: "成员角色",
        type: "status",
        enum: MEMBER_ROLE_TABLE_ENUM,
      },
      { key: "joinedAt", title: "加入时间", type: "datetime" },
    ],
  },
  filters: {
    fields: [
      {
        key: "taskId",
        label: "任务",
        component: "remoteSelect",
        field: "taskId",
        operator: "eq",
        remote: { source: "tasks" },
      },
      {
        key: "memberRole",
        label: "成员角色",
        component: "select",
        field: "memberRole",
        operator: "eq",
        options: [...MEMBER_ROLE_OPTIONS],
      },
    ],
  },
  form: {
    title: "添加成员",
    createButtonLabel: "添加审核员",
    description: "审核员（REVIEWER）可进入审核工作台；标注员（LABELER）仅用于任务协作标识，题目指派请用「任务分配管理」。",
    width: "md",
    sections: [
      {
        key: "member",
        title: "成员信息",
        fields: [
          {
            key: "userId",
            label: "用户",
            component: "user",
            required: true,
            remote: { source: "collaborators", params: { role: { from: "memberRole" } } },
            user: { idField: "userId", nameField: "userDisplayName", roleFrom: "memberRole" },
          },
          {
            key: "memberRole",
            label: "成员角色",
            component: "select",
            required: true,
            defaultValue: "REVIEWER",
            options: [...MEMBER_ROLE_OPTIONS],
            description: "审核工作台要求成员角色为 REVIEWER。",
          },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消" },
      { key: "submit", label: "添加", kind: "submit" },
    ],
  },
  detail: {
    sections: [],
  },
  headerActions: [
    {
      key: "create",
      label: "添加审核员",
      kind: "drawer",
      permission: ["system:admin", "business:task:update"],
    },
  ],
  actions: [],
};
