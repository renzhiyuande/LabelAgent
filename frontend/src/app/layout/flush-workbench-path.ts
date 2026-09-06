import { matchPath } from "react-router-dom";

const LABELER_WORK_PATH = "/labeler/work/:assignmentId";
const TEMPLATE_DESIGNER_PATH = "/system/template-designer";

/** workbench2 flush 布局页：主内容区需去掉 App Shell 默认 padding */
export function isFlushWorkbenchPath(pathname: string): boolean {
  return (
    Boolean(matchPath({ path: LABELER_WORK_PATH, end: true }, pathname)) ||
    pathname.startsWith("/reviewer/audit-pool") ||
    pathname.startsWith("/reviewer/ai-queue")
  );
}

/** 可进入禅模式/沉浸式 Shell 的工作台路由（KeepAlive 切 tab 时用于清理全局 Shell 状态） */
export function isWorkbenchShellPath(pathname: string): boolean {
  return isFlushWorkbenchPath(pathname) || pathname === TEMPLATE_DESIGNER_PATH;
}
