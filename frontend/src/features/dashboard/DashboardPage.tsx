import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AppPageContainer } from "@/app/layout/AppPageContainer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";
import { DashboardWorkspaceCard } from "./components/DashboardWorkspaceCard";
import { hasAnyPermission, metricsForWorkspace, roleWorkspaces } from "./lib/dashboard-config";
import { useDashboardOverview } from "./lib/use-dashboard-overview";

export function DashboardPage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const permissions = new Set(currentUser?.permissions ?? []);
  const roles = new Set(currentUser?.roles ?? []);
  const activeWorkspaces = roleWorkspaces
    .map((workspace) => ({
      ...workspace,
      visibleLinks: workspace.links.filter((link) => hasAnyPermission(permissions, link.permission)),
    }))
    .filter((workspace) => workspace.activeWhen(permissions, roles));

  const { overview, loading, errors } = useDashboardOverview(activeWorkspaces.map((workspace) => workspace.key));
  const quickLinks = activeWorkspaces.flatMap((workspace) =>
    workspace.visibleLinks.map((link) => ({
      ...link,
      workspaceTitle: workspace.title,
      workspaceBadge: workspace.badge,
    })),
  );

  return (
    <AppPageContainer
      title="角色工作台"
      extra={<Badge variant="outline">{currentUser?.roleNames?.join(" / ") || "未识别角色"}</Badge>}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto pb-6">
        {quickLinks.length > 0 ? (
          <Card className="rounded-[28px] border-border/70 bg-card/90 shadow-[0_20px_50px_hsl(var(--foreground)/0.08)]">
            <CardHeader className="pb-3">
              <Badge variant="secondary" className="mb-2 w-fit">
                快速入口
              </Badge>
              <CardTitle className="text-xl">常用页面</CardTitle>
              <CardDescription>按当前账号权限展示可直接进入的业务页面。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {quickLinks.slice(0, 9).map((link) => (
                <Link
                  key={`${link.workspaceTitle}-${link.href}`}
                  to={link.href}
                  className="group flex items-center justify-between rounded-[20px] border border-border/70 bg-background/80 px-4 py-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_16px_32px_hsl(var(--primary)/0.12)]"
                >
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-medium text-foreground">{link.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {link.workspaceBadge}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-[28px] border-border/70 bg-card/95">
            <CardHeader>
              <CardTitle>暂无可用入口</CardTitle>
              <CardDescription>当前账号没有匹配的业务权限，请联系管理员分配角色。</CardDescription>
            </CardHeader>
          </Card>
        )}

        <section className="grid gap-4 xl:grid-cols-2">
          {activeWorkspaces.length ? (
            activeWorkspaces.map((workspace) => (
              <DashboardWorkspaceCard
                key={workspace.key}
                workspace={workspace}
                metrics={metricsForWorkspace(workspace.key, overview)}
                loading={loading}
                error={errors[workspace.key]}
              />
            ))
          ) : (
            <Card className="rounded-[28px] border-border/70 bg-card/95">
              <CardHeader>
                <CardTitle>未识别到角色工作流</CardTitle>
                <CardDescription>当前账号暂无匹配的角色权限，无法显示专属工作台。</CardDescription>
              </CardHeader>
            </Card>
          )}
        </section>
      </div>
    </AppPageContainer>
  );
}
