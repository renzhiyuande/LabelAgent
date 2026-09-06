/** 在 textarea 光标处插入文本，返回新全文与光标位置 */
export function insertTextAtCursor(
  current: string,
  selectionStart: number,
  selectionEnd: number,
  insert: string,
): { text: string; cursor: number } {
  const start = Math.max(0, Math.min(selectionStart, current.length));
  const end = Math.max(start, Math.min(selectionEnd, current.length));
  const text = `${current.slice(0, start)}${insert}${current.slice(end)}`;
  const cursor = start + insert.length;
  return { text, cursor };
}

export function formatLlmTemplateVariable(path: string): string {
  return `{{${path}}}`;
}
