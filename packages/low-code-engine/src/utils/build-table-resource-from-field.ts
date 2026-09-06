import type { FormFieldSchema, ResourceMeta } from "../schema/types";

export function buildTableResourceFromField(field: FormFieldSchema, listResource: ResourceMeta): ResourceMeta {
  const meta = field.dynamicTable;
  if (!meta) {
    return listResource;
  }
  return {
    ...listResource,
    idKey: meta.rowKey ?? listResource.idKey,
    table: {
      ...(listResource.table ?? {}),
      columns: meta.columns ?? listResource.table?.columns ?? [],
      selectable: meta.selectable ?? false,
      pagination: meta.pagination ?? listResource.table?.pagination,
      rowKey: meta.rowKey,
    },
    actions: meta.hideActionsColumn ? [] : listResource.actions,
    capabilities: {
      ...listResource.capabilities,
      edit: false,
    },
    form: { sections: [], actions: [] },
  };
}
