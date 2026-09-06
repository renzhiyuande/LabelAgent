import { resolveFileDownloadUrl, uploadFileAsset } from "../../../adapters/asset-adapter";
import type { UploadedFileRef } from "../upload-types";

export async function uploadFormFile(file: File, category = "form"): Promise<UploadedFileRef> {
  const asset = await uploadFileAsset(file, category);
  return {
    id: asset.id,
    name: asset.originalName || file.name,
    size: asset.sizeBytes ?? file.size,
    mimeType: asset.mimeType || file.type || "application/octet-stream",
    url: resolveFileDownloadUrl(asset.downloadUrl, asset.id),
  };
}

export function revokeLocalPreview(file: UploadedFileRef | null | undefined) {
  if (file?.local && file.url?.startsWith("blob:")) {
    URL.revokeObjectURL(file.url);
  }
}
