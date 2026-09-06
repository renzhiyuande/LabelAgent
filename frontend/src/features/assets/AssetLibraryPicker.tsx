import { useCallback, useMemo } from "react";
import {
  fetchEngineList,
  getResourceMeta,
  LHResourceSidePanel,
} from "@/low-code";
import type { EngineListQuery, EngineListResult, ResourceRecord } from "@/low-code/types";
import type { ResourceMeta } from "@/low-code";
import type { HeaderActionHandler } from "@/low-code/actions/registry";
import type { FileAssetSummary } from "./file-assets-api";
import { uploadFileAsset } from "./file-assets-api";
import { useAuthStore } from "@/stores/auth";
import { appMessage } from "@/lib/message";
import { ensureFileAssetsActionsRegistered } from "./register-file-assets-actions";

export interface AssetLibraryPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mimeTypePrefix?: string;
  categoryCode?: string;
  title?: string;
  /** 多选模式：勾选后点「确认选择」 */
  multiple?: boolean;
  onSelect?: (asset: FileAssetSummary) => void;
  onSelectMany?: (assets: FileAssetSummary[]) => void;
}

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

export function AssetLibraryPicker({
  open,
  onOpenChange,
  mimeTypePrefix,
  categoryCode,
  title = "素材库",
  multiple = false,
  onSelect,
  onSelectMany,
}: AssetLibraryPickerProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  ensureFileAssetsActionsRegistered();
  const baseResource = getResourceMeta("fileAssets");

  const pickerResource = useMemo(() => {
    if (!baseResource) {
      return null;
    }
    return {
      ...baseResource,
      actions: [],
      table: {
        ...baseResource.table,
        selectable: multiple,
        picker: {
          enabled: true,
          selectionMode: (multiple ? "multiple" : "single") as "single" | "multiple",
          hideActionsColumn: true,
          rowClickSelect: true,
        },
      },
    };
  }, [baseResource, multiple]);

  const hiddenFilters = useMemo(() => {
    const hidden: string[] = [];
    if (categoryCode) {
      hidden.push("categoryCode");
    }
    if (mimeTypePrefix) {
      hidden.push("mimeTypePrefix");
    }
    return hidden;
  }, [categoryCode, mimeTypePrefix]);

  const loadList = useCallback(
    async (query: EngineListQuery): Promise<EngineListResult<ResourceRecord>> => {
      if (!pickerResource) {
        return { data: [], total: 0, page: query.page, pageSize: query.pageSize };
      }
      const filters = [...(query.filters ?? [])].filter(
        (item) => item.field !== "categoryCode" && item.field !== "mimeTypePrefix",
      );
      if (categoryCode) {
        filters.push({ field: "categoryCode", op: "eq", value: categoryCode });
      }
      if (mimeTypePrefix) {
        filters.push({ field: "mimeTypePrefix", op: "eq", value: mimeTypePrefix });
      }
      return fetchEngineList(pickerResource as ResourceMeta, {
        ...query,
        filters,
      });
    },
    [categoryCode, mimeTypePrefix, pickerResource],
  );

  const pickerHandlers = useMemo(
    () => ({
      onRowSelect: multiple
        ? undefined
        : (record: ResourceRecord) => {
            onSelect?.(record as unknown as FileAssetSummary);
            onOpenChange(false);
          },
      onConfirm: multiple
        ? (records: ResourceRecord[]) => {
            const assets = records as unknown as FileAssetSummary[];
            if (onSelectMany) {
              onSelectMany(assets);
            } else {
              assets.forEach((asset) => onSelect?.(asset));
            }
            onOpenChange(false);
          }
        : undefined,
    }),
    [multiple, onOpenChange, onSelect, onSelectMany],
  );

  const headerActionHandlers = useMemo<Record<string, HeaderActionHandler>>(
    () => ({
      "fileAssets.upload": async () => {
        const file = await pickSingleFile(mimeTypePrefix ? `${mimeTypePrefix}*` : undefined);
        if (!file) {
          return;
        }
        await uploadFileAsset(file, categoryCode ?? "asset");
        appMessage.success("上传成功");
        return { refresh: true };
      },
    }),
    [categoryCode, mimeTypePrefix],
  );

  if (!pickerResource) {
    return null;
  }

  return (
    <LHResourceSidePanel
      open={open}
      onClose={() => onOpenChange(false)}
      resource={pickerResource as ResourceMeta}
      currentUser={currentUser}
      title={title}
      description={
        multiple
          ? "勾选图片后点击「确认选择」，或上传新素材。"
          : "点击一行即可选择，或上传新素材。"
      }
      hideFilters={hiddenFilters}
      pageSize={20}
      embedded
      loadList={loadList}
      headerActionHandlers={headerActionHandlers}
      pickerHandlers={pickerHandlers}
    />
  );
}

export { resolveFileDownloadUrl } from "./file-assets-api";
