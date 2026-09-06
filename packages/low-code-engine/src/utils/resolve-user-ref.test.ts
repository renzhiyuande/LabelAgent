import { describe, expect, it } from "vitest";
import { resolveUserRefFromRecord, userRefInitial } from "./resolve-user-ref";

describe("resolveUserRefFromRecord", () => {
  it("resolves id and name from explicit meta", () => {
    const ref = resolveUserRefFromRecord(
      { labelerId: "30", labelerName: "Anna" },
      "labelerName",
      { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
    );
    expect(ref.userId).toBe("30");
    expect(ref.displayName).toBe("Anna");
    expect(ref.role).toBe("LABELER");
  });

  it("infers id field from name suffix", () => {
    const ref = resolveUserRefFromRecord({ ownerId: 9, ownerName: "Bob" }, "ownerName");
    expect(ref.userId).toBe(9);
    expect(ref.displayName).toBe("Bob");
  });

  it("falls back to alternate display name fields", () => {
    const ref = resolveUserRefFromRecord(
      { userId: 1001, userDisplayName: "审核员 Lin" },
      "userName",
      { idField: "userId", nameField: "userName" },
    );
    expect(ref.userId).toBe(1001);
    expect(ref.displayName).toBe("审核员 Lin");
  });
});

describe("userRefInitial", () => {
  it("uses first CJK char for compact avatar", () => {
    expect(userRefInitial("标注员甲")).toBe("标");
  });

  it("uses two latin initials", () => {
    expect(userRefInitial("Cici")).toBe("CI");
  });
});
