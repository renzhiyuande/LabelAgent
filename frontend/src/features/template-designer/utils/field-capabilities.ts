const OPTION_COMPONENTS = new Set([
  "select",
  "multiSelect",
  "radioGroup",
  "checkboxGroup",
]);

const REMOTE_COMPONENTS = new Set(["remoteSelect", "remoteTreeSelect"]);

const JSON_COMPONENTS = new Set(["jsonEditor", "codeEditor"]);

export function fieldHasOptions(component: string): boolean {
  return OPTION_COMPONENTS.has(component);
}

export function fieldHasRemote(component: string): boolean {
  return REMOTE_COMPONENTS.has(component);
}

export function fieldHasJsonEditor(component: string): boolean {
  return JSON_COMPONENTS.has(component);
}

export function fieldSupportsSpan(component: string): boolean {
  return !fieldHasJsonEditor(component) && component !== "array";
}