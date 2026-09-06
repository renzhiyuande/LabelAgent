"use client";

import type { ReactNode } from "react";
import { openAuthenticatedDownload } from "../../adapters/asset-adapter";
import { appMessage } from "../../adapters/lowcode-utils";

interface LHAuthenticatedDownloadLinkProps {
  href: string;
  fileId?: number | string;
  fileName?: string;
  children: ReactNode;
  className?: string;
}

export function LHAuthenticatedDownloadLink({
  href,
  fileId,
  fileName,
  children,
  className = "text-primary hover:underline",
}: LHAuthenticatedDownloadLinkProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void openAuthenticatedDownload({ url: href, fileId, fileName }).catch((error) => {
          const message = error instanceof Error ? error.message : "文件下载失败";
          appMessage.error(message);
        });
      }}
    >
      {children}
    </button>
  );
}
