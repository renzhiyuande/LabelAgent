import { openAuthenticatedDownload, uploadFileAsset } from "@/features/assets/file-assets-api";
import { normalizeSnowflakeId } from "@/lib/id-utils";
import { appMessage } from "@/lib/message";
import { registerHeaderAction, registerResourceAction } from "@/low-code/actions/registry";

function pickSingleFile(accept?: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (accept) {
      input.accept = accept;
    }
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0] ?? null;
        input.remove();
        resolve(file);
      },
      { once: true },
    );
    input.click();
  });
}

let registered = false;

export function ensureFileAssetsActionsRegistered() {
  if (registered) {
    return;
  }
  registered = true;

  registerHeaderAction("fileAssets.upload", async () => {
    const file = await pickSingleFile();
    if (!file) {
      return;
    }
    await uploadFileAsset(file, "asset");
    appMessage.success("上传成功");
    return { refresh: true };
  });

  // 低码列表行操作不走 LHAuthenticatedDownloadLink，需用 actionCode 接到 openAuthenticatedDownload。
  registerResourceAction("exportDownload", async ({ record }) => {
    const exportId = normalizeSnowflakeId(record.id) ?? record.id;
    if (exportId == null || exportId === "") {
      appMessage.info("缺少导出任务 ID");
      return;
    }
    const fileName =
      typeof record.jobName === "string" && record.jobName.trim() ? record.jobName.trim() : undefined;
    try {
      await openAuthenticatedDownload({
        url: `/api/v1/owner/exports/${exportId}/download`,
        fileName,
      });
    } catch (error) {
      appMessage.errorFrom(error, "下载失败");
    }
  });
}
