export const DICT_SOURCE_PREFIX = "dict:";

export function toDictSource(dictCode: string): string {
  return `${DICT_SOURCE_PREFIX}${dictCode}`;
}

export function isDictSource(source: string): boolean {
  return source.startsWith(DICT_SOURCE_PREFIX);
}

export function parseDictSource(source: string): string | null {
  if (!isDictSource(source)) {
    return null;
  }
  const dictCode = source.slice(DICT_SOURCE_PREFIX.length).trim();
  return dictCode || null;
}

export function resolveDictSource(dictCode?: string, remoteSource?: string): string | null {
  if (dictCode) {
    return toDictSource(dictCode);
  }
  if (remoteSource && isDictSource(remoteSource)) {
    return remoteSource;
  }
  return null;
}
