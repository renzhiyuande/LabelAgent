import { Refine } from "@refinedev/core";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthBootstrap } from "./app/auth/AuthBootstrap";
import { AppRoutes } from "./app/router";
import { accessControlProvider } from "./providers/accessControlProvider";
import { authProvider } from "./providers/authProvider";
import { dataProvider } from "./providers/dataProvider";
import { appQueryClient } from "./providers/query-client";
import { buildRefineResources } from "./providers/refine-resources";
import { AssetLibraryPicker } from "./features/assets/AssetLibraryPicker";
import {
  fetchAuthenticatedFileBlobUrl,
  openAuthenticatedDownload,
  resolveFileDownloadUrl,
  revokeAuthenticatedFileBlobUrl,
  uploadFileAsset,
} from "./features/assets/file-assets-api";
import { useAuthenticatedFileUrl } from "./features/assets/use-authenticated-file-url";
import {
  registerLabelHubHeaderActionCallbacks,
  registerLabelHubResources,
} from "./low-code-resources/register";
import { ensureFileAssetsActionsRegistered } from "./features/assets/register-file-assets-actions";
import { ensureOwnerAiReviewActionRegistered } from "./features/business/register-owner-ai-review-action";
import { Toaster } from "./components/ui/sonner";
import { LHPromptFormHost, configure } from "@labelhub/low-code-engine";
import { request } from "./utils/apiClient";
import { appMessage } from "./lib/message";
import {
  getRouteMetaByPath,
  getWorkspaceRouteDefinitions,
  resolveWorkspaceMountKey,
} from "./lib/route-meta";
import { useAuthStore } from "./stores/auth";
import { useThemeStore } from "./stores/theme";
import { useUiDensityStore } from "./stores/ui-density";
import { dismissBootSplash } from "./lib/boot-splash";
import "./styles.css";

// 配置低代码引擎的 HTTP client 和 MessageService
configure({
  httpClient: {
    request: (path, init = {}) =>
      request(
        path,
        {
          method: init?.method,
          headers: init?.headers,
          body:
            init?.body == null || typeof init.body === "string"
              ? init.body
              : JSON.stringify(init.body),
          signal: init?.signal,
        },
        {
          notifyOnError: init?.notifyOnError,
          errorMessage: init?.errorMessage,
          signal: init?.signal,
        },
      ),
  },
  messageService: appMessage as unknown as import("@labelhub/low-code-engine").MessageService,
  fileAssetService: {
    useAuthenticatedFileUrl,
    openAuthenticatedDownload,
    resolveFileDownloadUrl: (downloadUrl, fileId) => {
      const resolved = resolveFileDownloadUrl(downloadUrl, fileId);
      return resolved || undefined;
    },
    uploadFileAsset,
    fetchAuthenticatedFileBlobUrl,
    revokeAuthenticatedFileBlobUrl,
    AssetLibraryPicker: ({ open, onClose, onSelect, ...rest }) => (
      <AssetLibraryPicker
        {...rest}
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            return;
          }
          onClose?.();
        }}
        onSelect={(asset) => onSelect(asset)}
      />
    ),
  },
  routeMetaService: {
    getRouteMetaByPath,
    getWorkspaceRouteDefinitions,
    resolveWorkspaceMountKey,
  },
});

// 首屏渲染前同步应用主题，避免暗色/色盘闪烁或被静态 CSS 覆盖
useThemeStore.getState().hydrate();
useUiDensityStore.getState().hydrate();

registerLabelHubResources();
registerLabelHubHeaderActionCallbacks(
  ensureFileAssetsActionsRegistered,
  ensureOwnerAiReviewActionRegistered,
);

function App() {
  const hydrate = useAuthStore((state) => state.hydrate);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <QueryClientProvider client={appQueryClient}>
        <Refine
          authProvider={authProvider}
          dataProvider={dataProvider}
          accessControlProvider={accessControlProvider}
          resources={buildRefineResources()}
          options={{
            reactQuery: {
              clientConfig: appQueryClient,
            },
          }}
        >
          <AuthBootstrap />
          <LHPromptFormHost />
          <AppRoutes />
          <Toaster />
        </Refine>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    dismissBootSplash();
  });
});
