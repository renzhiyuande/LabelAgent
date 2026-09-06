import { appMessage } from "../../adapters/lowcode-utils";
import type { LowCodePlugin } from "../types";

export const demoLowCodePlugin: LowCodePlugin = {
  pluginId: "demo-actions",
  setup(api) {
    api.headerActions.register("exportDemo", () => {
      appMessage.info("执行导出");
    });
  },
};
