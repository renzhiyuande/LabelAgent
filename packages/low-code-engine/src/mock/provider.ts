import type { OptionItem } from "../schema/types";
import type { EngineActionRequest, EngineListQuery, EngineListResult } from "../types";
import { getValueAtPath } from "../utils/object-path";

type DemoOrderRecord = Record<string, unknown> & {
  id: number;
  title: string;
  description: string;
  status: string;
  scene: string;
  priority: string;
  priorityRank: number;
  enabled: boolean;
  ownerIds: number[];
  ownerNames: string[];
  reviewers: string[];
  notifyChannel: string;
  auditRules: string[];
  tags: string[];
  districtLabel: string;
  reviewMode: string;
  contact: {
    owner: {
      name: string;
      email: string;
    };
    channel: {
      slack: string;
      feishu: string;
    };
  };
  settings: {
    runtime: {
      configJson: Record<string, unknown>;
      script: string;
    };
  };
  steps: Array<Record<string, unknown>>;
  updatedAt: string;
};

type DemoOrderPayload = {
  title: string;
  description: string;
  status: string;
  scene: string;
  priority: string;
  priorityRank: number;
  enabled: boolean;
  ownerIds: number[];
  ownerNames: string[];
  reviewers: string[];
  notifyChannel: string;
  auditRules: string[];
  tags: string[];
  districtLabel: string;
  reviewMode: string;
  contact: DemoOrderRecord["contact"];
  settings: DemoOrderRecord["settings"];
  steps: DemoOrderRecord["steps"];
};

const owners: OptionItem[] = [
  { label: "林岚", value: 101 },
  { label: "周钧", value: 102 },
  { label: "沈一", value: 103 },
  { label: "陈澄", value: 104 },
];

const provinceOptions: OptionItem[] = [
  { label: "浙江省", value: "zhejiang" },
  { label: "江苏省", value: "jiangsu" },
];

const cityOptions: Record<string, OptionItem[]> = {
  zhejiang: [
    { label: "杭州市", value: "hangzhou" },
    { label: "宁波市", value: "ningbo" },
  ],
  jiangsu: [
    { label: "南京市", value: "nanjing" },
    { label: "苏州市", value: "suzhou" },
  ],
};

const districtOptions: Record<string, OptionItem[]> = {
  hangzhou: [
    { label: "西湖区", value: "xihu" },
    { label: "滨江区", value: "binjiang" },
  ],
  ningbo: [
    { label: "鄞州区", value: "yinzhou" },
    { label: "海曙区", value: "haishu" },
  ],
  nanjing: [
    { label: "鼓楼区", value: "gulou" },
    { label: "建邺区", value: "jianye" },
  ],
  suzhou: [
    { label: "工业园区", value: "sip" },
    { label: "姑苏区", value: "gusu" },
  ],
};

const reviewerOptions: Record<string, OptionItem[]> = {
  review: [
    { label: "张栩", value: "张栩" },
    { label: "顾青", value: "顾青" },
  ],
  ingest: [
    { label: "胡越", value: "胡越" },
    { label: "周钧", value: "周钧" },
  ],
  ops: [
    { label: "陈澄", value: "陈澄" },
    { label: "林岚", value: "林岚" },
  ],
};

function ownerNamesFromIds(ids: number[]): string[] {
  return owners.filter((item) => ids.includes(Number(item.value))).map((item) => item.label);
}

function priorityRank(priority: string): number {
  switch (priority) {
    case "P0":
      return 0;
    case "P1":
      return 1;
    case "P2":
      return 2;
    default:
      return 9;
  }
}

function optionLabel(options: OptionItem[], value: unknown): string {
  return options.find((item) => item.value === value)?.label ?? String(value ?? "");
}

function districtLabel(province?: unknown, city?: unknown, district?: unknown): string {
  return [optionLabel(provinceOptions, province), optionLabel(cityOptions[String(province ?? "")] ?? [], city), optionLabel(districtOptions[String(city ?? "")] ?? [], district)]
    .filter(Boolean)
    .join(" / ");
}

let demoOrders: DemoOrderRecord[] = [
  {
    id: 1001,
    title: "审核队列规则重构",
    description: "把人工审核优先级拆成配置项，并验证回放结果。",
    status: "IN_PROGRESS",
    scene: "review",
    priority: "P0",
    priorityRank: 0,
    enabled: true,
    ownerIds: [101, 102],
    ownerNames: ownerNamesFromIds([101, 102]),
    reviewers: ["张栩", "顾青"],
    notifyChannel: "feishu",
    auditRules: ["manual-review", "fallback-loop"],
    tags: ["审核", "自动化", "级联"],
    districtLabel: "浙江省 / 杭州市 / 西湖区",
    reviewMode: "manual",
    contact: {
      owner: {
        name: "林岚",
        email: "linlan@labelhub.dev",
      },
      channel: {
        slack: "#ops-review",
        feishu: "审核自动化项目组",
      },
    },
    settings: {
      runtime: {
        configJson: { autoApprove: false, threshold: 0.82 },
        script: "return queue.filter((item) => item.score > 0.8);",
      },
    },
    steps: [
      { name: "人工初审", type: "manual", executor: 101, enabled: true, note: "高风险先人工兜底" },
      { name: "回调通知", type: "webhook", executor: 102, enabled: true, callbackUrl: "https://example.com/review/callback" },
    ],
    updatedAt: "2026-05-21T14:20:00Z",
  },
  {
    id: 1002,
    title: "导入任务失败补偿",
    description: "模拟第三方数据导入失败后的重试和人工接管链路。",
    status: "PENDING",
    scene: "ingest",
    priority: "P1",
    priorityRank: 1,
    enabled: true,
    ownerIds: [103],
    ownerNames: ownerNamesFromIds([103]),
    reviewers: ["胡越"],
    notifyChannel: "email",
    auditRules: ["auto-pass"],
    tags: ["数据接入"],
    districtLabel: "江苏省 / 南京市 / 鼓楼区",
    reviewMode: "incremental",
    contact: {
      owner: {
        name: "沈一",
        email: "shenyi@labelhub.dev",
      },
      channel: {
        slack: "#data-ingest",
        feishu: "导入补偿小组",
      },
    },
    settings: {
      runtime: {
        configJson: { retryTimes: 3, fallback: "manual" },
        script: "return payload.records.map((item) => ({ ...item, synced: true }));",
      },
    },
    steps: [{ name: "增量同步", type: "auto", executor: 103, enabled: true, note: "失败后自动切人工" }],
    updatedAt: "2026-05-20T09:15:00Z",
  },
];

function wait(ms = 160): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function applyFilters(records: DemoOrderRecord[], query: EngineListQuery): DemoOrderRecord[] {
  return records.filter((record) => {
    const keyword = query.keyword?.toLowerCase();
    if (keyword) {
      const content = `${record.title} ${record.description}`.toLowerCase();
      if (!content.includes(keyword)) {
        return false;
      }
    }

    for (const filter of query.filters ?? []) {
      const current = record[filter.field as keyof DemoOrderRecord];
      if (filter.op === "eq" && current !== filter.value) {
        return false;
      }
      if (filter.op === "in" && Array.isArray(filter.value)) {
        const currentValues = Array.isArray(current) ? current : [current];
        if (!filter.value.some((item) => currentValues.includes(item))) {
          return false;
        }
      }
      if (filter.op === "like" && typeof filter.value === "string") {
        if (!String(current ?? "").toLowerCase().includes(filter.value.toLowerCase())) {
          return false;
        }
      }
      if (filter.op === "between" && Array.isArray(filter.value)) {
        const [start, end] = filter.value;
        if (filter.field === "updatedAt") {
          const currentTime = new Date(String(record.updatedAt)).getTime();
          const startTime = typeof start === "string" && start ? new Date(start).getTime() : null;
          const endTime = typeof end === "string" && end ? new Date(end).getTime() : null;
          if (startTime != null && currentTime < startTime) {
            return false;
          }
          if (endTime != null && currentTime > endTime) {
            return false;
          }
        } else if (filter.field === "priorityRank") {
          const currentRank = Number(record.priorityRank ?? 0);
          const startRank = start === "" || start == null ? null : Number(start);
          const endRank = end === "" || end == null ? null : Number(end);
          if (startRank != null && !Number.isNaN(startRank) && currentRank < startRank) {
            return false;
          }
          if (endRank != null && !Number.isNaN(endRank) && currentRank > endRank) {
            return false;
          }
        }
      }
    }

    return true;
  });
}

function applySort(records: DemoOrderRecord[], query: EngineListQuery): DemoOrderRecord[] {
  const [sort] = query.sort ?? [];
  if (!sort) {
    return records;
  }
  return [...records].sort((left, right) => {
    const leftValue = left[sort.field as keyof DemoOrderRecord] as string | number | boolean | undefined;
    const rightValue = right[sort.field as keyof DemoOrderRecord] as string | number | boolean | undefined;
    if (leftValue === rightValue) {
      return 0;
    }
    if (leftValue === undefined) {
      return sort.order === "asc" ? -1 : 1;
    }
    if (rightValue === undefined) {
      return sort.order === "asc" ? 1 : -1;
    }
    const result = leftValue > rightValue ? 1 : -1;
    return sort.order === "asc" ? result : -result;
  });
}

function normalizePayload(values: Record<string, unknown>): DemoOrderPayload {
  const ownerIds = Array.isArray(values.ownerIds) ? values.ownerIds.map((item) => Number(item)) : [];
  const province = values.province;
  const city = values.city;
  const district = values.district;
  const runtimeConfig = getValueAtPath(values, "settings.runtime.configJson");
  const runtimeScript = getValueAtPath(values, "settings.runtime.script");
  const contactOwnerName = getValueAtPath(values, "contact.owner.name");
  const contactOwnerEmail = getValueAtPath(values, "contact.owner.email");
  const slack = getValueAtPath(values, "contact.channel.slack");
  const feishu = getValueAtPath(values, "contact.channel.feishu");

  return {
    title: String(values.title ?? ""),
    description: String(values.description ?? ""),
    status: String(values.status ?? "PENDING"),
    scene: String(values.scene ?? "review"),
    priority: String(values.priority ?? "P1"),
    priorityRank: priorityRank(String(values.priority ?? "P1")),
    enabled: Boolean(values.enabled),
    ownerIds,
    ownerNames: ownerNamesFromIds(ownerIds),
    reviewers: Array.isArray(values.reviewers) ? values.reviewers.map(String) : [],
    notifyChannel: String(values.notifyChannel ?? "feishu"),
    auditRules: Array.isArray(values.auditRules) ? values.auditRules.map(String) : [],
    tags: Array.isArray(values.tags) ? values.tags.map(String) : [],
    districtLabel: districtLabel(province, city, district),
    reviewMode: String(values.reviewMode ?? ""),
    contact: {
      owner: {
        name: String(contactOwnerName ?? ""),
        email: String(contactOwnerEmail ?? ""),
      },
      channel: {
        slack: String(slack ?? ""),
        feishu: String(feishu ?? ""),
      },
    },
    settings: {
      runtime: {
        configJson:
          typeof runtimeConfig === "string" && runtimeConfig
            ? JSON.parse(runtimeConfig)
            : (runtimeConfig as Record<string, unknown>) ?? {},
        script: String(runtimeScript ?? ""),
      },
    },
    steps: Array.isArray(values.steps) ? values.steps : [],
  };
}

export async function fetchMockList(query: EngineListQuery): Promise<EngineListResult<DemoOrderRecord>> {
  await wait();
  const filtered = applyFilters(demoOrders, query);
  const sorted = applySort(filtered, query);
  const start = (query.page - 1) * query.pageSize;
  const end = start + query.pageSize;
  return {
    data: sorted.slice(start, end),
    total: sorted.length,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function fetchMockDetail(id: string | number): Promise<DemoOrderRecord> {
  await wait();
  const record = demoOrders.find((item) => item.id === Number(id));
  if (!record) {
    throw new Error("mock record not found");
  }
  return record;
}

export async function createMockRecord(values: Record<string, unknown>): Promise<DemoOrderRecord> {
  await wait();
  const nextId = Math.max(...demoOrders.map((item) => item.id)) + 1;
  const payload: DemoOrderPayload = normalizePayload(values);
  const record: DemoOrderRecord = {
    id: nextId,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  demoOrders = [record, ...demoOrders];
  return record;
}

export async function updateMockRecord(id: string | number, values: Record<string, unknown>): Promise<DemoOrderRecord> {
  await wait();
  const targetId = Number(id);
  const index = demoOrders.findIndex((item) => item.id === targetId);
  if (index < 0) {
    throw new Error("mock record not found");
  }
  const current = demoOrders[index];
  const next: DemoOrderRecord = {
    ...current,
    ...normalizePayload(values),
    id: targetId,
    updatedAt: new Date().toISOString(),
  };
  demoOrders = demoOrders.map((item) => (item.id === targetId ? next : item));
  return next;
}

export async function runMockAction({ action, record }: EngineActionRequest): Promise<void> {
  await wait(120);
  demoOrders = demoOrders.map((item) => {
    if (item.id !== Number(record.id)) {
      return item;
    }
    if (action.key === "approve") {
      return { ...item, status: "DONE", updatedAt: new Date().toISOString() };
    }
    if (action.key === "archive") {
      return { ...item, status: "ARCHIVED", updatedAt: new Date().toISOString() };
    }
    return item;
  });
}

export async function fetchMockOptions(source: string, keyword?: string): Promise<OptionItem[]> {
  await wait(100);
  let options: OptionItem[] = [];
  if (source === "owners") {
    options = owners;
  } else if (source === "provinces") {
    options = provinceOptions;
  } else if (source === "reviewers") {
    options = Object.values(reviewerOptions).flat();
  }
  if (!keyword) {
    return options;
  }
  const lowerKeyword = keyword.toLowerCase();
  return options.filter((option) => option.label.toLowerCase().includes(lowerKeyword));
}

export async function fetchMockDependentOptions(source: string, dependsValue?: string): Promise<OptionItem[]> {
  await wait(80);
  if (source === "cities") {
    return cityOptions[dependsValue ?? ""] ?? [];
  }
  if (source === "districts") {
    return districtOptions[dependsValue ?? ""] ?? [];
  }
  if (source === "reviewers") {
    return reviewerOptions[dependsValue ?? ""] ?? [];
  }
  return [];
}
