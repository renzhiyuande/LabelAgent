import { create } from "zustand";
import type { FormFieldComponent, FormFieldSchema, FormSchema, FormSectionSchema } from "@/low-code/schema/types";
import { setValueAtPath } from "@/low-code/utils/object-path";
import {
  createEmptyFormSchema,
  generateUniqueFieldKey,
  generateUniqueSectionKey,
} from "@/low-code/utils/form-schema";
import {
  getComponentDefaultPatch,
  sanitizeFieldForComponent,
} from "../constants/component-registry";
import { withImportFieldMeta } from "@/low-code/schema/import-field-meta";
import { createFieldFromMaterial } from "../utils/material-catalog";
import {
  countFormFields,
  findFieldInSections,
  findSection,
  insertFieldInSection,
  insertFieldInArrayParent,
  moveFieldInArrayParent,
  moveFieldInSection,
  patchFieldInSections,
  patchFieldInSectionsWithUpdater,
  patchSection,
  removeFieldFromSections,
} from "../utils/schema-edit";
import type { TemplateVersionItem } from "../types";
import type { TaskImportPayloadContract } from "@/features/business/utils/import-payload-contract";

export type PropertyTabId = "basic" | "component" | "validation" | "linkage";

export interface DesignerPreviewSampleState {
  taskId: string;
  taskTitle: string;
  taskItemId: string;
  taskItemLabel: string;
  itemPayload: Record<string, unknown>;
}

interface DesignerEditorState {
  formSchema: FormSchema;
  templateName: string;
  versionNo: string;
  resourceKey: string;
  templateId: string | null;
  importContract: TaskImportPayloadContract | null;
  versions: TemplateVersionItem[];
  currentVersionId: string | null;
  activeSectionKey: string;
  selectedId: string | null;
  selectedParentKey: string | null;
  propertyTab: PropertyTabId;
  isPreviewMode: boolean;
  previewValues: Record<string, unknown>;
  previewSample: DesignerPreviewSampleState | null;
  previewSampleDrawerNonce: number;
  isDirty: boolean;
}

interface DesignerEditorActions {
  resetEditor: () => void;
  setTemplateId: (templateId: string | null) => void;
  setImportContract: (contract: TaskImportPayloadContract | null) => void;
  setTemplateName: (name: string) => void;
  setTemplateNameQuiet: (name: string) => void;
  setVersions: (versions: TemplateVersionItem[]) => void;
  markVersionAsCurrent: (versionId: string) => void;
  loadFormSchema: (schema: FormSchema) => void;
  setDirty: (dirty: boolean) => void;
  setActiveSectionKey: (sectionKey: string) => void;
  select: (id: string | null, propertyTab?: PropertyTabId) => void;
  setPropertyTab: (tab: PropertyTabId) => void;
  clearSelection: () => void;
  togglePreviewMode: (enabled?: boolean) => void;
  setPreviewValues: (values: Record<string, unknown>) => void;
  updatePreviewValue: (path: string, value: unknown) => void;
  setPreviewSample: (sample: DesignerPreviewSampleState | null) => void;
  clearPreviewSample: () => void;
  loadFormSchemaForPreview: (schema: FormSchema) => void;
  requestPreviewSampleDrawer: () => void;
  addSection: (title?: string) => void;
  removeSection: (sectionKey: string) => void;
  updateSection: (sectionKey: string, patch: Partial<FormSectionSchema>) => void;
  addField: (materialKey: string, index?: number) => void;
  removeField: (fieldKey: string) => void;
  updateField: (fieldKey: string, patch: Partial<FormFieldSchema>) => void;
  updateNestedField: (parentKey: string, childKey: string, patch: Partial<FormFieldSchema>) => void;
  changeFieldComponent: (fieldKey: string, component: FormFieldComponent, parentKey?: string | null) => void;
  enterArrayScope: (parentFieldKey: string) => void;
  exitArrayScope: () => void;
  moveFieldToIndex: (fromIndex: number, toIndex: number) => void;
  moveFieldUp: (fieldKey: string) => void;
  moveFieldDown: (fieldKey: string) => void;
  getActiveSection: () => FormSectionSchema | undefined;
  getActiveFields: () => FormFieldSchema[];
  getSelectedField: () => FormFieldSchema | undefined;
  getSelectedSection: () => FormSectionSchema | undefined;
  getScopeFields: () => FormFieldSchema[];
  isSectionSelected: (sectionKey: string) => boolean;
  countFields: () => number;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export type DesignerEditorStore = DesignerEditorState & DesignerEditorActions;

const emptySchema = createEmptyFormSchema();

const MAX_UNDO_STACK = 50;
let undoStack: FormSchema[] = [];
let redoStack: FormSchema[] = [];

function pushUndo(schema: FormSchema) {
  undoStack = [...undoStack.slice(-(MAX_UNDO_STACK - 1)), schema];
  redoStack = [];
}

const initialState: DesignerEditorState = {
  formSchema: emptySchema,
  templateName: "新建模板",
  versionNo: "1.0.0",
  resourceKey: "template_preview",
  templateId: null,
  importContract: null,
  versions: [],
  currentVersionId: null,
  activeSectionKey: emptySchema.sections[0]?.key ?? "",
  selectedId: null,
  selectedParentKey: null,
  propertyTab: "basic",
  isPreviewMode: false,
  previewValues: {},
  previewSample: null,
  previewSampleDrawerNonce: 0,
  isDirty: false,
};

export const useDesignerEditorStore = create<DesignerEditorStore>((set, get) => ({
  ...initialState,

  resetEditor: () => set({ ...initialState, formSchema: createEmptyFormSchema() }),

  setTemplateId: (templateId) => set({ templateId }),

  setImportContract: (importContract) => set({ importContract }),

  setTemplateName: (name) => set({ templateName: name, isDirty: true }),

  setTemplateNameQuiet: (name) => set({ templateName: name }),

  setVersions: (versions) => set({ versions }),

  markVersionAsCurrent: (versionId) => {
    const version = get().versions.find((item) => item.id === versionId);
    set({
      versions: get().versions.map((item) => ({ ...item, isCurrent: item.id === versionId })),
      currentVersionId: versionId,
      versionNo: version?.versionNo ?? get().versionNo,
    });
  },

  loadFormSchema: (schema) => {
    const firstKey = schema.sections[0]?.key ?? "";
    set({
      formSchema: schema,
      activeSectionKey: firstKey,
      selectedId: null,
      selectedParentKey: null,
      propertyTab: "basic",
      isDirty: false,
      isPreviewMode: false,
      previewSample: null,
    });
  },

  loadFormSchemaForPreview: (schema) => {
    const firstKey = schema.sections[0]?.key ?? "";
    set({
      formSchema: schema,
      activeSectionKey: firstKey,
      selectedId: null,
      selectedParentKey: null,
      propertyTab: "basic",
      isDirty: false,
    });
  },

  setDirty: (dirty) => set({ isDirty: dirty }),

  setActiveSectionKey: (sectionKey) =>
    set({
      activeSectionKey: sectionKey,
      selectedId: null,
      selectedParentKey: null,
      propertyTab: "basic",
    }),

  select: (id, propertyTab) =>
    set({
      selectedId: id,
      propertyTab: propertyTab ?? "basic",
    }),

  setPropertyTab: (tab) => set({ propertyTab: tab }),

  clearSelection: () => {
    const { selectedParentKey } = get();
    set({ selectedId: selectedParentKey });
  },

  togglePreviewMode: (enabled) =>
    set((state) => ({
      isPreviewMode: enabled ?? !state.isPreviewMode,
      selectedId: enabled ?? !state.isPreviewMode ? null : state.selectedId,
    })),

  setPreviewValues: (values) => set({ previewValues: values }),

  setPreviewSample: (previewSample) => set({ previewSample }),

  clearPreviewSample: () => set({ previewSample: null }),

  requestPreviewSampleDrawer: () =>
    set({ previewSampleDrawerNonce: Date.now() }),

  updatePreviewValue: (path, value) =>
    set((state) => ({
      previewValues: setValueAtPath(state.previewValues, path, value),
      isDirty: true,
    })),

  addSection: (title) => {
    const { formSchema } = get();
    pushUndo(formSchema);
    const key = generateUniqueSectionKey(formSchema);
    const section: FormSectionSchema = {
      key,
      title: title ?? `区块 ${formSchema.sections.length + 1}`,
      fields: [],
    };
    set({
      formSchema: { ...formSchema, sections: [...formSchema.sections, section] },
      activeSectionKey: key,
      selectedId: key,
      isDirty: true,
    });
  },

  removeSection: (sectionKey) => {
    const { formSchema, activeSectionKey } = get();
    if (formSchema.sections.length <= 1) {
      return;
    }
    pushUndo(formSchema);
    const nextSections = formSchema.sections.filter((section) => section.key !== sectionKey);
    const removedIndex = formSchema.sections.findIndex((section) => section.key === sectionKey);
    const nextActive =
      activeSectionKey === sectionKey
        ? (nextSections[Math.min(removedIndex, nextSections.length - 1)]?.key ?? "")
        : activeSectionKey;
    set({
      formSchema: { ...formSchema, sections: nextSections },
      activeSectionKey: nextActive,
      selectedId: get().selectedId === sectionKey ? null : get().selectedId,
      isDirty: true,
    });
  },

  updateSection: (sectionKey, patch) => {
    pushUndo(get().formSchema);
    set((state) => ({
      formSchema: {
        ...state.formSchema,
        sections: patchSection(state.formSchema.sections, sectionKey, (section) => ({
          ...section,
          ...patch,
        })),
      },
      isDirty: true,
    }));
  },

  addField: (materialKey, index) => {
    const { formSchema, activeSectionKey, selectedParentKey } = get();
    pushUndo(formSchema);
    const fieldKey = generateUniqueFieldKey(formSchema);
    const field =
      createFieldFromMaterial(materialKey, fieldKey) ??
      ({ key: fieldKey, path: fieldKey, label: "新字段", component: "text" } satisfies FormFieldSchema);

    if (selectedParentKey) {
      const parent = findFieldInSections(formSchema.sections, selectedParentKey);
      if (!parent || parent.component !== "array") {
        return;
      }
      set({
        formSchema: {
          ...formSchema,
          sections: insertFieldInArrayParent(formSchema.sections, selectedParentKey, field, index),
        },
        selectedId: fieldKey,
        isDirty: true,
      });
      return;
    }

    const sectionKey = findSection(formSchema.sections, activeSectionKey)
      ? activeSectionKey
      : (formSchema.sections[0]?.key ?? "");
    if (!sectionKey) {
      return;
    }

    set({
      formSchema: {
        ...formSchema,
        sections: insertFieldInSection(formSchema.sections, sectionKey, field, index),
      },
      activeSectionKey: sectionKey,
      selectedId: fieldKey,
      isDirty: true,
    });
  },

  removeField: (fieldKey) => {
    pushUndo(get().formSchema);
    set((state) => ({
      formSchema: {
        ...state.formSchema,
        sections: removeFieldFromSections(state.formSchema.sections, fieldKey),
      },
      selectedId: state.selectedId === fieldKey ? null : state.selectedId,
      selectedParentKey: state.selectedParentKey === fieldKey ? null : state.selectedParentKey,
      isDirty: true,
    }));
  },

  updateField: (fieldKey, patch) => {
    pushUndo(get().formSchema);
    set((state) => ({
      formSchema: {
        ...state.formSchema,
        sections: patchFieldInSections(state.formSchema.sections, fieldKey, patch),
      },
      isDirty: true,
    }));
  },

  updateNestedField: (parentKey, childKey, patch) => {
    pushUndo(get().formSchema);
    set((state) => ({
      formSchema: {
        ...state.formSchema,
        sections: patchFieldInSectionsWithUpdater(state.formSchema.sections, parentKey, (parent) => ({
          ...parent,
          fields: (parent.fields ?? []).map((child) =>
            child.key === childKey ? { ...child, ...patch } : child,
          ),
        })),
      },
      isDirty: true,
    }));
  },

  changeFieldComponent: (fieldKey, component: FormFieldComponent, parentKey = null) => {
    const { formSchema, activeSectionKey, selectedParentKey } = get();
    const effectiveParentKey =
      parentKey ?? (selectedParentKey && fieldKey !== selectedParentKey ? selectedParentKey : null);

    if (effectiveParentKey) {
      set({
        formSchema: {
          ...formSchema,
          sections: patchFieldInSectionsWithUpdater(formSchema.sections, effectiveParentKey, (parent) => ({
            ...parent,
            fields: (parent.fields ?? []).map((child) => {
              if (child.key !== fieldKey) {
                return child;
              }
              const normalized = sanitizeFieldForComponent(child, component);
              let next = { ...normalized, ...getComponentDefaultPatch(component) };
              if (component === "showItem") {
                const source = next.showItem?.contentSource ?? "payload";
                next = withImportFieldMeta(next, source === "payload" ? "display" : "runtime");
              } else if (component === "showImage" || component === "showFile" || component === "showVideo") {
                const source =
                  (component === "showImage"
                    ? next.showImage
                    : component === "showVideo"
                      ? next.showVideo
                      : next.showFile)?.contentSource ?? "payload";
                next = withImportFieldMeta(next, source === "payload" ? "display" : "runtime");
              }
              return next;
            }),
          })),
        },
        isDirty: true,
      });
      return;
    }

    set({
      formSchema: {
        ...formSchema,
        sections: patchSection(formSchema.sections, activeSectionKey, (section) => ({
          ...section,
          fields: section.fields.map((field) => {
            if (field.key !== fieldKey) {
              return field;
            }
            const normalized = sanitizeFieldForComponent(field, component);
            let next = { ...normalized, ...getComponentDefaultPatch(component) };
            if (component === "showItem") {
              const source = next.showItem?.contentSource ?? "payload";
              next = withImportFieldMeta(next, source === "payload" ? "display" : "runtime");
            } else if (component === "showImage" || component === "showFile" || component === "showVideo") {
              const source =
                (component === "showImage"
                  ? next.showImage
                  : component === "showVideo"
                    ? next.showVideo
                    : next.showFile)?.contentSource ?? "payload";
              next = withImportFieldMeta(next, source === "payload" ? "display" : "runtime");
            }
            return next;
          }),
        })),
      },
      isDirty: true,
    });
  },

  enterArrayScope: (parentFieldKey) => {
    const parent = findFieldInSections(get().formSchema.sections, parentFieldKey);
    if (!parent || parent.component !== "array") {
      return;
    }
    set({ selectedId: parentFieldKey, selectedParentKey: parentFieldKey });
  },

  exitArrayScope: () => set({ selectedParentKey: null, selectedId: null }),

  moveFieldToIndex: (fromIndex, toIndex) => {
    const { formSchema, activeSectionKey, selectedParentKey } = get();
    pushUndo(formSchema);
    if (selectedParentKey) {
      set({
        formSchema: {
          ...formSchema,
          sections: moveFieldInArrayParent(formSchema.sections, selectedParentKey, fromIndex, toIndex),
        },
        isDirty: true,
      });
      return;
    }
    set({
      formSchema: {
        ...formSchema,
        sections: moveFieldInSection(formSchema.sections, activeSectionKey, fromIndex, toIndex),
      },
      isDirty: true,
    });
  },

  moveFieldUp: (fieldKey) => {
    const fields = get().getActiveFields();
    const index = fields.findIndex((field) => field.key === fieldKey);
    if (index > 0) {
      get().moveFieldToIndex(index, index - 1);
    }
  },

  moveFieldDown: (fieldKey) => {
    const fields = get().getActiveFields();
    const index = fields.findIndex((field) => field.key === fieldKey);
    if (index >= 0 && index < fields.length - 1) {
      get().moveFieldToIndex(index, index + 1);
    }
  },

  getActiveSection: () => {
    const { formSchema, activeSectionKey } = get();
    return findSection(formSchema.sections, activeSectionKey);
  },

  getActiveFields: () => get().getActiveSection()?.fields ?? [],

  getSelectedField: () => {
    const { formSchema, selectedId, selectedParentKey } = get();
    if (!selectedId) {
      return undefined;
    }
    const section = findSection(formSchema.sections, selectedId);
    if (section) {
      return undefined;
    }
    const field = findFieldInSections(formSchema.sections, selectedId);
    if (!field) {
      return undefined;
    }
    if (selectedParentKey && selectedId !== selectedParentKey) {
      const parent = findFieldInSections(formSchema.sections, selectedParentKey);
      if (!parent?.fields?.some((child) => child.key === selectedId)) {
        return undefined;
      }
    }
    return field;
  },

  getSelectedSection: () => {
    const { formSchema, selectedId, selectedParentKey } = get();
    if (selectedParentKey || !selectedId) {
      return undefined;
    }
    return formSchema.sections.find((section) => section.key === selectedId);
  },

  getScopeFields: () => {
    const { formSchema, selectedParentKey } = get();
    if (selectedParentKey) {
      return findFieldInSections(formSchema.sections, selectedParentKey)?.fields ?? [];
    }
    return get().getActiveFields();
  },

  isSectionSelected: (sectionKey) => get().selectedId === sectionKey,

  countFields: () => countFormFields(get().formSchema),

  undo: () => {
    const prev = undoStack.pop();
    if (!prev) return;
    redoStack.push(get().formSchema);
    set({ formSchema: prev, isDirty: true });
  },

  redo: () => {
    const next = redoStack.pop();
    if (!next) return;
    undoStack.push(get().formSchema);
    set({ formSchema: next, isDirty: true });
  },

  canUndo: () => undoStack.length > 0,

  canRedo: () => redoStack.length > 0,
}));
