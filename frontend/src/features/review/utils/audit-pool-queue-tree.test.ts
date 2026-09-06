import { describe, expect, it } from "vitest";
import { buildAuditPoolQueueTree, filterAuditPoolRows } from "./audit-pool-queue-tree";
import type { ManualReviewRow } from "../types";

const sampleRows: ManualReviewRow[] = [
  {
    id: "1",
    submissionCode: "SUB-1",
    title: "题目 A",
    labeler: "张三",
    labelerId: "10",
    taskId: "201",
    taskName: "任务甲",
    itemId: "501",
    itemSeqNo: 1,
    submittedAt: "2026-01-02T00:00:00.000Z",
    status: "pending",
  },
  {
    id: "2",
    submissionCode: "SUB-2",
    title: "题目 B",
    labeler: "李四",
    labelerId: "11",
    taskId: "201",
    taskName: "任务甲",
    itemId: "502",
    itemSeqNo: 2,
    submittedAt: "2026-01-01T00:00:00.000Z",
    status: "pending",
  },
];

describe("audit-pool-queue-tree", () => {
  it("filters rows by task, labeler, or submission keyword", () => {
    expect(filterAuditPoolRows(sampleRows, "张三")).toHaveLength(1);
    expect(filterAuditPoolRows(sampleRows, "任务甲")).toHaveLength(2);
    expect(filterAuditPoolRows(sampleRows, "SUB-2")).toHaveLength(1);
  });

  it("builds task → labeler → submission hierarchy", () => {
    const tree = buildAuditPoolQueueTree(sampleRows, "task");
    expect(tree).toHaveLength(1);
    expect(tree[0]?.label).toBe("任务甲");
    expect(tree[0]?.children).toHaveLength(2);
    expect(tree[0]?.count).toBe(2);
  });

  it("builds labeler → task hierarchy", () => {
    const tree = buildAuditPoolQueueTree(sampleRows, "labeler");
    expect(tree).toHaveLength(2);
    expect(tree.every((node) => node.children.length === 1)).toBe(true);
  });
});
