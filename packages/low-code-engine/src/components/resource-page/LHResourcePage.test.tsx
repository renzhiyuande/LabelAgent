import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EngineListQuery } from "../../types";
import type { ResourceMeta } from "../../schema/types";

const querySnapshots: EngineListQuery[] = [];

vi.mock("@refinedev/core", () => ({
  useGetIdentity: () => ({ data: undefined }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../../../stores/auth", () => ({
  useAuthStore: (selector: (state: { currentUser: null }) => unknown) =>
    selector({ currentUser: null }),
}));

vi.mock("../../../stores/navigation", () => ({
  useNavigationStore: (selector: (state: { loadMenus: () => Promise<void> }) => unknown) =>
    selector({ loadMenus: async () => {} }),
}));

vi.mock("../../hooks/use-resource-can", () => ({
  useResourceCan: () => ({ data: { can: true } }),
}));

vi.mock("../../hooks/use-resource-list", () => ({
  useResourceList: (_resource: ResourceMeta, listQuery: EngineListQuery) => {
    querySnapshots.push(JSON.parse(JSON.stringify(listQuery)) as EngineListQuery);
    return {
      records: [],
      total: 0,
      initialLoading: false,
      refreshing: false,
      refetch: vi.fn(),
    };
  },
}));

vi.mock("../../hooks/use-resource-mutations", () => ({
  useResourceMutations: () => ({
    create: vi.fn(),
    update: vi.fn(),
    runAction: vi.fn(),
    usesRefineMutations: false,
  }),
}));

vi.mock("../../hooks/use-confirm-action", () => ({
  useConfirmAction: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

vi.mock("../../hooks/use-drawer-detail-loader", () => ({
  useDrawerDetailLoader: () => ({
    load: async <T,>(loader: () => Promise<T>) => loader(),
  }),
}));

vi.mock("../data-table/LHDataTable", () => ({
  LHDataTable: () => <div data-testid="lh-data-table" />,
}));

vi.mock("../drawers/LHFormDrawer", () => ({
  LHFormDrawer: () => null,
}));

vi.mock("../drawers/LHDetailDrawer", () => ({
  LHDetailDrawer: () => null,
}));

vi.mock("../drawers/LHAssignmentDrawer", () => ({
  LHAssignmentDrawer: () => null,
}));

vi.mock("../dialogs/LHConfirmDialog", () => ({
  LHConfirmDialog: () => null,
}));

vi.mock("../query-bar/LHQueryBar", () => ({
  LHQueryBar: ({
    values,
    onChange,
    onSubmit,
  }: {
    values: Record<string, unknown>;
    onChange: (key: string, value: unknown) => void;
    onSubmit: (nextValues?: Record<string, unknown>) => void;
  }) => (
    <div>
      <input
        data-testid="keyword-input"
        value={String(values.keyword ?? "")}
        onChange={(event) => onChange("keyword", event.target.value)}
      />
      <button
        type="button"
        onClick={() => onSubmit()}
      >
        查询
      </button>
    </div>
  ),
}));

import { LHResourcePage } from "./LHResourcePage";

const resource: ResourceMeta = {
  resource: "users",
  label: "用户",
  idKey: "id",
  permissions: {
    page: "system:admin",
  },
  capabilities: {
    query: true,
    detail: true,
    create: true,
    edit: true,
  },
  api: {
    list: "/api/v1/admin/users",
    detail: "/api/v1/admin/users/{id}",
    create: "/api/v1/admin/users",
    update: "/api/v1/admin/users/{id}",
  },
  table: {
    pagination: true,
    columns: [],
  },
  filters: {
    primary: ["keyword", "status"],
    fields: [
      { key: "keyword", label: "关键词", component: "text", field: "keyword", operator: "like" },
      {
        key: "status",
        label: "状态",
        component: "select",
        field: "status",
        operator: "eq",
        options: [
          { label: "ACTIVE", value: "ACTIVE" },
          { label: "DISABLED", value: "DISABLED" },
        ],
      },
    ],
  },
  form: {
    sections: [],
    actions: [],
  },
  detail: {
    sections: [],
  },
  actions: [],
};

describe("LHResourcePage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    querySnapshots.length = 0;
  });

  it("submits query and refreshes list query payload", async () => {
    render(
      <LHResourcePage
        title="用户管理"
        resource={resource}
        loadRemoteOptions={async () => []}
      />,
    );

    fireEvent.change(screen.getByTestId("keyword-input"), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("button", { name: "查询" }));

    await waitFor(() => {
      expect(querySnapshots.at(-1)?.keyword).toBe("admin");
      expect(querySnapshots.at(-1)?.page).toBe(1);
    });
  });

  it("WB-FE-LC-007: 空列表时仍渲染查询栏与页面壳层", () => {
    const { container } = render(
      <LHResourcePage
        title="用户管理"
        resource={resource}
        loadRemoteOptions={async () => []}
      />,
    );

    expect(container.querySelector(".lh-resource-page")).not.toBeNull();
    expect(screen.getByTestId("keyword-input")).toBeTruthy();
  });

  it("applies scope filter to list query", async () => {
    render(
      <LHResourcePage
        title="用户管理"
        resource={resource}
        scope={{ field: "tenantId", value: 9 }}
        hideFilters={["status"]}
        embedded
        loadRemoteOptions={async () => []}
      />,
    );

    await waitFor(() => {
      expect(querySnapshots.at(-1)?.filters).toEqual(
        expect.arrayContaining([{ field: "tenantId", op: "eq", value: "9" }]),
      );
    });
  });
});
