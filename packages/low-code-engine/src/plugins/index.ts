import {
  registerBulkResourceAction,
  resolveBulkResourceAction,
  unregisterBulkResourceAction,
} from "../actions/bulk-action-registry";
import {
  registerHeaderAction,
  registerResourceAction,
  resolveHeaderAction,
  resolveResourceAction,
  unregisterHeaderAction,
  unregisterResourceAction,
} from "../actions/registry";
export { demoLowCodePlugin } from "./examples/demo-low-code-plugin";
import type { LowCodePlugin, LowCodePluginApi } from "./types";

const lowCodePluginApi: LowCodePluginApi = {
  headerActions: {
    register: registerHeaderAction,
    unregister: unregisterHeaderAction,
    resolve: resolveHeaderAction,
  },
  resourceActions: {
    register: registerResourceAction,
    unregister: unregisterResourceAction,
    resolve: resolveResourceAction,
  },
  bulkActions: {
    register: registerBulkResourceAction,
    unregister: unregisterBulkResourceAction,
    resolve: resolveBulkResourceAction,
  },
};

const installedPlugins = new Set<string>();

export function installLowCodePlugin(plugin: LowCodePlugin) {
  if (installedPlugins.has(plugin.pluginId)) {
    return;
  }
  plugin.setup(lowCodePluginApi);
  installedPlugins.add(plugin.pluginId);
}

export function getLowCodePluginApi() {
  return lowCodePluginApi;
}
