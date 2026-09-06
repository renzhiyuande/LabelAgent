import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, request } from "./apiClient";
import { appMessage } from "../lib/message";

vi.mock("../lib/message", () => ({
  appMessage: {
    error: vi.fn(),
    errorFrom: vi.fn(),
  },
  markMessageErrorHandled: vi.fn((error: { handled?: boolean }) => {
    error.handled = true;
  }),
  isMessageErrorHandled: vi.fn((error: { handled?: boolean }) => error.handled === true),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("request auth refresh", () => {
  beforeEach(() => {
    localStorage.setItem("labelhub.accessToken", "expired-access");
    localStorage.setItem("labelhub.refreshToken", "valid-refresh");
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          jsonResponse(
            {
              code: "AUTH_004",
              message: "Invalid or expired token",
              data: null,
              traceId: "t1",
            },
            401,
          ),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            code: "SUCCESS",
            message: "ok",
            data: {
              accessToken: "new-access",
              refreshToken: "new-refresh",
              expiresInSeconds: 3600,
            },
            traceId: "t2",
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            code: "SUCCESS",
            message: "ok",
            data: { userId: 1, username: "admin" },
            traceId: "t3",
          }),
        ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("does not attach expired access token to login requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse({
          code: "SUCCESS",
          message: "ok",
          data: {
            accessToken: "new-access",
            refreshToken: "new-refresh",
            expiresInSeconds: 3600,
          },
          traceId: "t-login",
        }),
      ),
    );

    await request<{ accessToken: string }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBeNull();
  });

  it("refreshes access token and retries the original request", async () => {
    const data = await request<{ userId: number; username: string }>("/api/v1/auth/me");

    expect(data.username).toBe("admin");
    expect(localStorage.getItem("labelhub.accessToken")).toBe("new-access");
    expect(localStorage.getItem("labelhub.refreshToken")).toBe("new-refresh");
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("/api/v1/auth/refresh"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refreshToken: "valid-refresh" }),
      }),
    );
  });
});

describe("request error notification", () => {
  beforeEach(() => {
    localStorage.setItem("labelhub.accessToken", "access-token");
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("shows one translated toast and marks 500 errors as handled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            code: "SYS_004",
            message: "Database connection failed",
            data: null,
            traceId: "trace-500",
          },
          500,
        ),
      ),
    );

    let caught: unknown;
    await request("/api/v1/demo").catch((error) => {
      caught = error;
    });

    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({ handled: true, code: "SYS_004", status: 500 });

    expect(appMessage.error).toHaveBeenCalledTimes(1);
    expect(appMessage.error).toHaveBeenCalledWith(
      "System error, please retry later",
      "错误码：SYS_004 · TraceId：trace-500",
    );
    expect(appMessage.errorFrom).not.toHaveBeenCalled();
  });

  it("shows one translated toast and marks 400 errors as handled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        jsonResponse(
          {
            code: "RVW_007",
            message:
              "No historical review cases are available for prompt optimization on this template version. Please accumulate runtime data first.",
            data: null,
            traceId: "trace-400",
          },
          400,
        ),
      ),
    );

    let caught: unknown;
    await request("/api/v1/owner/template-versions/1/review-config/assist", {
      method: "POST",
      body: JSON.stringify({}),
    }).catch((error) => {
      caught = error;
    });

    expect(caught).toMatchObject({ handled: true, code: "RVW_007", status: 400 });
    expect(appMessage.error).toHaveBeenCalledTimes(1);
    expect(appMessage.error).toHaveBeenCalledWith(
      "No reviewed submissions with AI and human comments are available under published versions of this template. Publish the template, run the task, and complete manual reviews first.",
      "错误码：RVW_007 · TraceId：trace-400",
    );
  });
});
