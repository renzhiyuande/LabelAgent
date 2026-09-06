import { useLogin } from "@refinedev/core";
import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { appMessage, isMessageErrorHandled } from "../../lib/message";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutateAsync: login, isLoading: submitting } = useLogin<{ username: string; password: string }>();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const inFlightRef = useRef(false);

  async function handleSubmit() {
    if (inFlightRef.current || submitting) {
      return;
    }
    inFlightRef.current = true;
    try {
      await appMessage.promise(
        login({ username, password }),
        {
          loading: "登录中...",
          success: "登录成功",
          error: "登录失败",
        },
      );
      const next = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(next, { replace: true });
    } catch (error) {
      if (!isMessageErrorHandled(error)) {
        appMessage.error("登录失败", "请检查账号密码或稍后重试");
      }
    } finally {
      inFlightRef.current = false;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),hsl(var(--background))_45%,hsl(var(--muted)))] p-6 transition-colors">
      <Card className="w-full max-w-md shadow-xl shadow-[0_20px_60px_hsl(var(--foreground)/0.08)]">
        <CardHeader>
          <CardTitle className="text-2xl">登录 LabelHub Admin</CardTitle>
          <CardDescription>企业级管理后台工作区。请使用你当前环境中配置的账号登录。</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="login-username">
                用户名
              </label>
              <Input
                id="login-username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="login-password">
                密码
              </label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "登录中..." : "进入后台"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
