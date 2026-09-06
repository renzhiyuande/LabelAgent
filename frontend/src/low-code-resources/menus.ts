import type { ResourceMeta } from "@/low-code/schema/types";

export const menusResource: ResourceMeta = {
  resource: "menus",
  label: "菜单",
  idKey: "id",
  page: {
    key: "tree",
    tree: {
      treeColumnKey: "menuName",
      parentField: "parentId",
      defaultExpanded: true,
    },
  },
  permissions: {
    page: "system:admin",
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
  },
  prepareValues: (values) => ({
    menuCode: values.menuCode,
    menuName: values.menuName,
    menuType: values.menuType,
    parentId: values.parentId == null || values.parentId === "" ? 0 : Number(values.parentId),
    path: values.path || null,
    routeName: values.routeName || null,
    componentPath: values.componentPath || null,
    icon: values.icon || null,
    permissionCode: values.permissionCode || null,
    visible: Boolean(values.visible),
    disabled: Boolean(values.disabled),
    sortNo: values.sortNo == null || values.sortNo === "" ? 0 : Number(values.sortNo),
  }),
  api: {
    query: "/api/v1/admin/menus",
    detail: "/api/v1/admin/menus/{id}",
    create: "/api/v1/admin/menus",
    update: "/api/v1/admin/menus/{id}",
    actions: {
      enable: "/api/v1/admin/menus/{id}/enable",
      disable: "/api/v1/admin/menus/{id}/disable",
    },
    options: {
      menus: "/api/v1/engine/options/menus",
    },
  },
  table: {
    pagination: true,
    columns: [
      { key: "menuCode", title: "菜单编码", type: "text" },
      { key: "menuName", title: "菜单名称", type: "text" },
      { key: "path", title: "路径", type: "text" },
      { key: "routeName", title: "路由名", type: "text" },
      { key: "permissionCode", title: "权限码", type: "text" },
      { key: "status", title: "状态", type: "status", dict: "common_status" },
    ],
  },
  filters: {
    fields: [
      {
        key: "keyword",
        label: "关键词",
        component: "text",
        field: "keyword",
        operator: "like",
        placeholder: "菜单编码 / 名称",
      },
      {
        key: "menuType",
        label: "菜单类型",
        component: "select",
        field: "menuType",
        operator: "eq",
        dict: "menu_type",
      },
      {
        key: "status",
        label: "状态",
        component: "select",
        field: "status",
        operator: "eq",
        dict: "common_status",
      },
    ],
  },
  form: {
    sections: [
      {
        key: "basic",
        title: "菜单信息",
        fields: [
          { key: "menuCode", label: "菜单编码", component: "text", required: true },
          { key: "menuName", label: "菜单名称", component: "text", required: true },
          {
            key: "menuType",
            label: "菜单类型",
            component: "select",
            required: true,
            defaultValue: "MENU",
            dict: "menu_type",
          },
          {
            key: "parentId",
            label: "父级菜单",
            component: "remoteTreeSelect",
            remote: {
              source: "menus",
              treeApi: "/api/v1/admin/menus/tree",
            },
          },
          { key: "path", label: "访问路径", component: "text" },
          { key: "routeName", label: "路由名称", component: "text" },
          { key: "componentPath", label: "组件路径", component: "text" },
          { key: "icon", label: "图标", component: "text" },
          { key: "permissionCode", label: "权限码", component: "text" },
          { key: "sortNo", label: "排序", component: "number", defaultValue: 0 },
          { key: "visible", label: "是否显示", component: "switch", defaultValue: true },
          { key: "disabled", label: "是否禁用", component: "switch", defaultValue: false },
        ],
      },
    ],
    actions: [
      { key: "cancel", label: "取消" },
      { key: "submit", label: "保存", kind: "submit" },
    ],
  },
  detail: {
    sections: [
      {
        key: "basic",
        title: "菜单详情",
        fields: [
          { key: "menuCode", label: "菜单编码", type: "text" },
          { key: "menuName", label: "菜单名称", type: "text" },
          { key: "menuType", label: "菜单类型", type: "text" },
          { key: "parentId", label: "父级 ID", type: "text" },
          { key: "path", label: "访问路径", type: "text" },
          { key: "routeName", label: "路由名称", type: "text" },
          { key: "componentPath", label: "组件路径", type: "text" },
          { key: "icon", label: "图标", type: "text" },
          { key: "permissionCode", label: "权限码", type: "text" },
          { key: "visible", label: "显示", type: "text", formatter: "boolean" },
          { key: "disabled", label: "禁用", type: "text", formatter: "boolean" },
          { key: "status", label: "状态", type: "status", dict: "common_status" },
        ],
      },
    ],
  },
  actions: [
    { key: "create", label: "新建", kind: "drawer", permission: "system:admin" },
    { key: "enable", label: "启用", kind: "request", permission: "system:admin", visibleWhen: [{ field: "status", operator: "ne", value: "ACTIVE" }] },
    { key: "disable", label: "禁用", kind: "danger", permission: "system:admin", visibleWhen: [{ field: "status", operator: "eq", value: "ACTIVE" }] },
  ],
};
