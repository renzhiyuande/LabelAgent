"use client";

import { useEffect, useRef } from "react";
import { fetchAuthenticatedFileBlobUrl, revokeAuthenticatedFileBlobUrl } from "../../../adapters/asset-adapter";

interface ShowItemRichHtmlViewProps {
  html: string;
  className?: string;
}

async function hydrateAuthenticatedMedia(
  root: HTMLElement,
): Promise<string[]> {
  const loadedIds: string[] = [];
  const media = [
    ...Array.from(root.querySelectorAll<HTMLImageElement>("img[data-lh-file-id]")),
    ...Array.from(root.querySelectorAll<HTMLVideoElement>("video[data-lh-file-id]")),
  ];

  for (const element of media) {
    const fileId = element.getAttribute("data-lh-file-id");
    if (!fileId) {
      continue;
    }
    try {
      const blobUrl = await fetchAuthenticatedFileBlobUrl(fileId);
      if (blobUrl) {
        element.src = blobUrl;
        loadedIds.push(fileId);
      }
    } catch {
      if (element instanceof HTMLImageElement) {
        element.alt = element.alt || "图片加载失败";
      } else {
        element.title = element.title || "视频加载失败";
      }
    }
  }

  return loadedIds;
}

/** 将 HTML 内 data-lh-file-id 图片/视频替换为带鉴权的 blob 地址 */
export function ShowItemRichHtmlView({ html, className }: ShowItemRichHtmlViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    let loadedIds: string[] = [];
    let cancelled = false;

    void hydrateAuthenticatedMedia(root).then((ids) => {
      if (!cancelled) {
        loadedIds = ids;
      }
    });

    return () => {
      cancelled = true;
      for (const fileId of loadedIds) {
        revokeAuthenticatedFileBlobUrl(fileId);
      }
    };
  }, [html]);

  return <div ref={rootRef} className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
