import { useState } from "react";
import { KeyRound, LogOut, Shield, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLogout } from "@refinedev/core";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { AppPageContainer } from "../../app/layout/AppPageContainer";
import { useAuthStore } from "../../stores/auth";
import { appMessage } from "../../lib/message";

export function ProfilePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const { mutate: logout } = useLogout();

  const initials = (currentUser?.displayName ?? currentUser?.username ?? "U").slice(0, 1).toUpperCase();
  const displayName = currentUser?.displayName ?? currentUser?.username ?? "未登录";

  return (
    <AppPageContainer>
      <div className="mx-auto grid h-full w-full max-w-5xl grid-cols-1 gap-6 overflow-auto pb-8 md:grid-cols-[280px_1fr]">
        {/* ── 左侧：用户概要 ── */}
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden rounded-[24px] border-border/80 bg-card/90 shadow-[0_16px_40px_hsl(var(--foreground)/0.06)]">
            <div className="h-20 bg-gradient-to-r from-primary/80 to-primary/40" />
            <div className="flex flex-col items-center px-6 pb-6 text-center">
              <div className="-mt-10 mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-white shadow-lg ring-4 ring-card">
                {initials}
              </div>
              <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">@{currentUser?.username}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {currentUser?.roleNames?.map((role) => (
                  <Badge key={role} variant="secondary" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

          {/* ── 修改密码 ── */}
          <ChangePasswordDialog />

          {/* ── 退出 ── */}
          <Button
            variant="outline"
            className="rounded-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick={() => {
              logout(undefined, {
                onSuccess: () => navigate("/login", { replace: true }),
              });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </Button>
        </div>

        {/* ── 右侧：详细信息 ── */}
        <div className="flex flex-col gap-6">
          {/* ── 账户信息 ── */}
          <Card className="rounded-[24px] border-border/80 bg-card/90 shadow-[0_16px_40px_hsl(var(--foreground)/0.06)]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">账户信息</CardTitle>
              </div>
              <CardDescription>你的账户基本信息和标识</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoRow label="用户 ID" value={String(currentUser?.userId ?? "-")} />
              <InfoRow label="用户名" value={currentUser?.username ?? "-"} />
              <InfoRow label="显示名称" value={currentUser?.displayName ?? "-"} />
            </CardContent>
          </Card>

          {/* ── 角色与权限 ── */}
          <Card className="rounded-[24px] border-border/80 bg-card/90 shadow-[0_16px_40px_hsl(var(--foreground)/0.06)]">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">角色与权限</CardTitle>
              </div>
              <CardDescription>你当前拥有的角色和权限列表</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">角色</p>
                <div className="flex flex-wrap gap-2">
                  {currentUser?.roleNames?.length ? (
                    currentUser.roleNames.map((role) => (
                      <Badge key={role} className="rounded-full px-3 py-1 text-xs">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">暂无角色</span>
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">权限 ({currentUser?.permissions?.length ?? 0})</p>
                {currentUser?.permissions?.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {currentUser.permissions.map((perm) => (
                      <code
                        key={perm}
                        className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {perm}
                      </code>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">暂无权限</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppPageContainer>
  );
}

/* ───── 修改密码对话框 ───── */

function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      appMessage.error("请填写所有密码字段");
      return;
    }
    if (newPassword !== confirmPassword) {
      appMessage.error("两次输入的新密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      appMessage.error("新密码长度不能少于 6 位");
      return;
    }
    setSubmitting(true);
    try {
      const { request } = await import("../../utils/apiClient");
      await request("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      setOpen(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      appMessage.success("密码修改成功");
    } catch {
      // apiClient 已自动通知错误
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full rounded-full">
          <KeyRound className="mr-2 h-4 w-4" />
          修改密码
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>请输入当前密码和新密码</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="old-password">当前密码</Label>
            <Input
              id="old-password"
              type="password"
              placeholder="输入当前密码"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">新密码</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="输入新密码（至少 6 位）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">确认新密码</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="再次输入新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "提交中..." : "确认修改"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/60 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
