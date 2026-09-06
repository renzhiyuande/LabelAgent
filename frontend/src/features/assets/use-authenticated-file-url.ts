import { useEffect, useState } from "react";
import {
  fetchAuthenticatedFileBlobUrl,
  revokeAuthenticatedFileBlobUrl,
} from "./file-assets-api";

function isDirectMediaUrl(url: string): boolean {
  return (
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    url.startsWith("http://") ||
    url.startsWith("https://")
  );
}

/**
 * 将 fileId 转为带 Bearer 的 blob URL；http(s)/blob 直链则原样使用。
 */
export function useAuthenticatedFileUrl(
  fileId?: number | string | null,
  directUrl?: string | null,
): string | null {
  const [url, setUrl] = useState<string | null>(() => {
    if (directUrl && isDirectMediaUrl(directUrl)) {
      return directUrl;
    }
    return null;
  });

  useEffect(() => {
    if (directUrl && isDirectMediaUrl(directUrl) && !fileId) {
      setUrl(directUrl);
      return;
    }
    if (!fileId) {
      setUrl(directUrl && isDirectMediaUrl(directUrl) ? directUrl : null);
      return;
    }

    let cancelled = false;
    void fetchAuthenticatedFileBlobUrl(fileId)
      .then((blobUrl) => {
        if (!cancelled) {
          setUrl(blobUrl);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
        }
      });

    return () => {
      cancelled = true;
      revokeAuthenticatedFileBlobUrl(fileId);
    };
  }, [fileId, directUrl]);

  return url;
}
