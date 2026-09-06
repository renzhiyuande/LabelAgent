import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authProvider } from "./authProvider";

function envelope<T>(data: T) {
  return {
    code: "SUCCESS",
    message: "ok",
    data,
    traceId: "trace-auth-1",
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("P0 白盒 — authProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("WB-FE-AUTH-007 / WB-AUTH-001: login 持久化 token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        envelope({
          accessToken: "access-1",
          refreshToken: "refresh-1",
          expiresInSeconds: 3600,
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await authProvider.login?.({ username: "admin", password: "admin123" });
    expect(result?.success).toBe(true);
    expect(localStorage.getItem("labelhub.accessToken")).toBe("access-1");
    expect(localStorage.getItem("labelhub.refreshToken")).toBe("refresh-1");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/auth/login"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("WB-FE-AUTH-008 / WB-AUTH-007: logout 清除会话", async () => {
    localStorage.setItem("labelhub.accessToken", "access-1");
    localStorage.setItem("labelhub.refreshToken", "refresh-1");

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(envelope(null)));
    vi.stubGlobal("fetch", fetchMock);

    const result = await authProvider.logout?.({});
    expect(result?.success).toBe(true);
    expect(localStorage.getItem("labelhub.accessToken")).toBeNull();
    expect(localStorage.getItem("labelhub.refreshToken")).toBeNull();
  });

  it("WB-FE-AUTH-002: 无 token 时 check 重定向登录", async () => {
    const result = await authProvider.check?.({});
    expect(result?.authenticated).toBe(false);
    expect(result?.redirectTo).toBe("/login");
  });

  it("WB-FE-AUTH-003: 有 token 时 check 通过", async () => {
    localStorage.setItem("labelhub.accessToken", "access-1");
    const result = await authProvider.check?.({});
    expect(result?.authenticated).toBe(true);
  });

  it("WB-FE-AUTH-004: getIdentity 未登录抛 AUTH_001", async () => {
    await expect(authProvider.getIdentity?.()).rejects.toMatchObject({
      code: "AUTH_001",
    });
  });
});
