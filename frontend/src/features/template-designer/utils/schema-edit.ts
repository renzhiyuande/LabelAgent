import type { FormFieldSchema, FormSchema, FormSectionSchema } from "@/low-code/schema/types";

export function findSection(sections: FormSectionSchema[], sectionKey: string) {
  return sections.find((section) => section.key === sectionKey);
}

export function patchSection(
  sections: FormSectionSchema[],
  sectionKey: string,
  updater: (section: FormSectionSchema) => FormSectionSchema,
): FormSectionSchema[] {
  return sections.map((section) => (section.key === sectionKey ? updater(section) : section));
}

export function findFieldInSections(
  sections: FormSectionSchema[],
  fieldKey: string,
): FormFieldSchema | undefined {
  for (const section of sections) {
    const found = visitFields(section.fields, fieldKey);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function visitFields(fields: FormFieldSchema[], fieldKey: string): FormFieldSchema | undefined {
  for (const field of fields) {
    if (field.key === fieldKey) {
      return field;
    }
    if (field.fields?.length) {
      const nested = visitFields(field.fields, fieldKey);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
}

export function patchFieldInSections(
  sections: FormSectionSchema[],
  fieldKey: string,
  patch: Partial<FormFieldSchema>,
): FormSectionSchema[] {
  return sections.map((section) => ({
    ...section,
    fields: patchFields(section.fields, fieldKey, patch),
  }));
}

function patchFields(
  fields: FormFieldSchema[],
  fieldKey: string,
  patch: Partial<FormFieldSchema>,
): FormFieldSchema[] {
  return fields.map((field) => {
    if (field.key === fieldKey) {
      return { ...field, ...patch };
    }
    if (field.fields?.length) {
      return { ...field, fields: patchFields(field.fields, fieldKey, patch) };
    }
    return field;
  });
}

export function removeFieldFromSections(sections: FormSectionSchema[], fieldKey: string) {
  return sections.map((section) => ({
    ...section,
    fields: removeFromFields(section.fields, fieldKey),
  }));
}

function removeFromFields(fields: FormFieldSchema[], fieldKey: string): FormFieldSchema[] {
  return fields
    .filter((field) => field.key !== fieldKey)
    .map((field) =>
      field.fields?.length
        ? { ...field, fields: removeFromFields(field.fields, fieldKey) }
        : field,
    );
}

export function moveFieldInSection(
  sections: FormSectionSchema[],
  sectionKey: string,
  fromIndex: number,
  toIndex: number,
): FormSectionSchema[] {
  return patchSection(sections, sectionKey, (section) => {
    const next = [...section.fields];
    const [item] = next.splice(fromIndex, 1);
    if (!item) {
      return section;
    }
    next.splice(toIndex, 0, item);
    return { ...section, fields: next };
  });
}

export function insertFieldInSection(
  sections: FormSectionSchema[],
  sectionKey: string,
  field: FormFieldSchema,
  index?: number,
): FormSectionSchema[] {
  return patchSection(sections, sectionKey, (section) => {
    const next = [...section.fields];
    if (index !== undefined && index >= 0) {
      next.splice(index, 0, field);
    } else {
      next.push(field);
    }
    return { ...section, fields: next };
  });
}

function patchFieldsWithUpdater(
  fields: FormFieldSchema[],
  fieldKey: string,
  updater: (field: FormFieldSchema) => FormFieldSchema,
): FormFieldSchema[] {
  return fields.map((field) => {
    if (field.key === fieldKey) {
      return updater(field);
    }
    if (field.fields?.length) {
      return { ...field, fields: patchFieldsWithUpdater(field.fields, fieldKey, updater) };
    }
    return field;
  });
}

export function patchFieldInSectionsWithUpdater(
  sections: FormSectionSchema[],
  fieldKey: string,
  updater: (field: FormFieldSchema) => FormFieldSchema,
): FormSectionSchema[] {
  return sections.map((section) => ({
    ...section,
    fields: patchFieldsWithUpdater(section.fields, fieldKey, updater),
  }));
}

export function insertFieldInArrayParent(
  sections: FormSectionSchema[],
  parentFieldKey: string,
  field: FormFieldSchema,
  index?: number,
): FormSectionSchema[] {
  return patchFieldInSectionsWithUpdater(sections, parentFieldKey, (parent) => {
    const next = [...(parent.fields ?? [])];
    if (index !== undefined && index >= 0) {
      next.splice(index, 0, field);
    } else {
      next.push(field);
    }
    return { ...parent, fields: next };
  });
}

export function moveFieldInArrayParent(
  sections: FormSectionSchema[],
  parentFieldKey: string,
  fromIndex: number,
  toIndex: number,
): FormSectionSchema[] {
  return patchFieldInSectionsWithUpdater(sections, parentFieldKey, (parent) => {
    const next = [...(parent.fields ?? [])];
    const [item] = next.splice(fromIndex, 1);
    if (!item) {
      return parent;
    }
    next.splice(toIndex, 0, item);
    return { ...parent, fields: next };
  });
}

export function countFormFields(schema: FormSchema): number {
  let count = 0;
  const visit = (fields: FormFieldSchema[]) => {
    for (const field of fields) {
      count += 1;
      if (field.fields?.length) {
        visit(field.fields);
      }
    }
  };
  for (const section of schema.sections) {
    visit(section.fields);
  }
  return count;
}
