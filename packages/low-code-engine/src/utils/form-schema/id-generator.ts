let counter = 0;

function generateRandomBytes(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateShortUUID(): string {
  return generateRandomBytes(12);
}

export function generateId(prefix: string = "id"): string {
  const timestamp = Date.now();
  const seq = (++counter).toString(36).padStart(4, '0');
  const random = generateShortUUID();
  return `${prefix}_${timestamp}_${seq}_${random}`;
}

export function generateSectionKey(): string {
  return generateId("section");
}

export function generateFieldKey(): string {
  return generateId("field");
}
