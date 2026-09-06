import { describe, expect, it } from "vitest";
import { tasksResource } from "./tasks";

describe("tasksResource import action", () => {
  it("contains DRAFT-only import entry action", () => {
    const action = tasksResource.actions?.find((item) => item.key === "importItems");
    expect(action).toBeTruthy();
    expect(action?.kind).toBe("request");
    expect(action?.sidePanel).toBeTruthy();
    expect(action?.sidePanel?.resourceKey).toBe("taskItems");
    expect(action?.sidePanel?.scope).toEqual({ field: "taskId", from: "id" });
    expect(action?.visibleWhen).toBeUndefined();
  });
});

describe("tasksResource template actions", () => {
  it("exposes template management workflow from task list", () => {
    const manageTemplates = tasksResource.actions?.find((item) => item.key === "manageTemplates");
    expect(manageTemplates).toBeTruthy();
    expect(manageTemplates?.hiddenInList).toBe(true);
    expect(manageTemplates?.kind).toBe("workflow");
    expect(manageTemplates?.workflow?.rendererCode).toBe("task.manageTemplate");
  });

  it("exposes workflow to open template designer", () => {
    const editTemplate = tasksResource.actions?.find((item) => item.key === "editTemplate");
    expect(editTemplate?.kind).toBe("workflow");
    expect(editTemplate?.workflow?.rendererCode).toBe("task.openDesigner");
  });
});

describe("tasksResource table columns", () => {
  it("keeps a compact set of list columns", () => {
    expect(tasksResource.table?.columns.map((column) => column.key)).toEqual([
      "taskCode",
      "title",
      "status",
      "quota",
      "readiness",
      "deadlineAt",
      "updatedAt",
    ]);
  });

  it("derives readiness summary for list display", () => {
    expect(
      tasksResource.normalizeRecord?.({
        templateReady: false,
        publishReady: false,
        publishBlockReason: "缺少已发布模板版本",
      }),
    ).toMatchObject({
      readiness: "缺少已发布模板版本",
      templateReady: "否",
      publishReady: "否",
    });

    expect(
      tasksResource.normalizeRecord?.({
        templateReady: true,
        publishReady: true,
      }),
    ).toMatchObject({
      readiness: "可发布",
      templateReady: "是",
      publishReady: "是",
    });
  });
});

describe("tasksResource form fields", () => {
  it("exposes optional template version tree select", () => {
    const field = tasksResource.form.sections
      .flatMap((section) => section.fields)
      .find((item) => item.key === "templateVersionId");
    expect(field).toMatchObject({
      component: "remoteTreeSelect",
      remote: { source: "templateVersionTree", variant: "tree" },
    });
    expect(field?.required).toBeFalsy();
  });

  it("strips template group values from create payload", () => {
    const prepared = tasksResource.prepareValues?.({
      taskCode: "TASK_A",
      title: "任务 A",
      sceneCode: "GENERAL",
      templateVersionId: "tpl:1001",
    });
    expect(prepared).toMatchObject({
      taskCode: "TASK_A",
      title: "任务 A",
      sceneCode: "GENERAL",
      templateVersionId: null,
    });
  });

  it("keeps template version id as string for snowflake-safe create payload", () => {
    const prepared = tasksResource.prepareValues?.({
      taskCode: "TASK_A",
      title: "任务 A",
      sceneCode: "GENERAL",
      templateVersionId: "2000000000000000001",
    });
    expect(prepared?.templateVersionId).toBe("2000000000000000001");
  });

  it("maps currentTemplateVersionId into templateVersionId for edit display", () => {
    const normalized = tasksResource.normalizeRecord?.({
      currentTemplateVersionId: "2000000000000000002",
      templateReady: false,
      publishReady: false,
    });
    expect(normalized).toMatchObject({
      templateVersionId: "2000000000000000002",
    });
  });

  it("loads distribute strategy from remote options", () => {
    const field = tasksResource.form.sections.flatMap((section) => section.fields).find((item) => item.key === "distributeStrategy");
    expect(field).toMatchObject({
      component: "remoteSelect",
      defaultValue: "FIRST_COME",
      remote: { source: "distributeStrategies" },
      required: true,
    });
  });

  it("loads reward rule mode and remote config form from backend", () => {
    const fields = tasksResource.form.sections.flatMap((section) => section.fields);
    const modeField = fields.find((item) => item.key === "rewardRuleMode");
    const configField = fields.find((item) => item.key === "rewardRuleConfig");

    expect(modeField).toMatchObject({
      component: "remoteSelect",
      defaultValue: "PER_APPROVED",
      remote: { source: "rewardRules" },
      required: true,
    });

    expect(configField).toMatchObject({
      component: "remoteSchema",
      remoteSchema: {
        api: "/api/v1/owner/remote-schemas/rewardRules/{rewardRuleMode}/form-schema",
        dependsOn: "rewardRuleMode",
        binding: {
          payloadField: "rewardRuleJson",
          discriminatorKey: "mode",
        },
      },
    });
  });

  it("renders reward rule detail via generic remoteSchema type", () => {
    const detailField = tasksResource.detail?.sections
      .flatMap((section) => section.fields)
      .find((item) => item.key === "rewardRuleJson");
    expect(detailField).toMatchObject({
      key: "rewardRuleJson",
      type: "remoteSchema",
    });
  });

  it("renders task settings detail via remoteSchema binding", () => {
    const detailField = tasksResource.detail?.sections
      .flatMap((section) => section.fields)
      .find((item) => item.key === "settingsJson");
    const schemaField = tasksResource.form.sections
      .flatMap((section) => section.fields)
      .find((item) => item.key === "taskSettingsConfig");

    expect(detailField).toMatchObject({
      key: "settingsJson",
      type: "remoteSchema",
    });
    expect(schemaField).toMatchObject({
      key: "taskSettingsConfig",
      component: "remoteSchema",
      remoteSchema: {
        api: "/api/v1/owner/remote-schemas/taskSettings/default/form-schema",
        binding: {
          payloadField: "settingsJson",
          stripSourceFields: false,
        },
      },
    });
  });

  it("loads review workflow config from remote schema", () => {
    const detailField = tasksResource.detail?.sections
      .flatMap((section) => section.fields)
      .find((item) => item.key === "reviewWorkflowJson");
    const schemaField = tasksResource.form.sections
      .flatMap((section) => section.fields)
      .find((item) => item.key === "reviewWorkflowConfig");

    expect(detailField).toMatchObject({
      key: "reviewWorkflowJson",
      type: "remoteSchema",
    });
    expect(schemaField).toMatchObject({
      key: "reviewWorkflowConfig",
      component: "remoteSchema",
      remoteSchema: {
        api: "/api/v1/owner/remote-schemas/reviewWorkflow/default/form-schema",
        binding: {
          payloadField: "reviewWorkflowJson",
          stripSourceFields: false,
        },
      },
    });
  });
});

describe("tasksResource publish action", () => {
  it("uses a workflow drawer to prepare template publishing", () => {
    const action = tasksResource.actions?.find((item) => item.key === "publish");
    expect(action?.kind).toBe("workflow");
    expect(action?.workflow?.rendererCode).toBe("task.publishPreparation");
    expect(action?.workflow?.title).toBe("发布任务");
  });
});

describe("tasksResource reviewer members action", () => {
  it("exposes manageReviewers side panel for taskMembers", () => {
    const action = tasksResource.actions?.find((item) => item.key === "manageReviewers");
    expect(action?.sidePanel?.resourceKey).toBe("taskMembers");
    expect(action?.sidePanel?.scope).toEqual({ field: "taskId", from: "id" });
    expect(action?.sidePanel?.listFilters).toEqual([{ field: "memberRole", op: "eq", value: "REVIEWER" }]);
    expect(action?.sidePanel?.createDefaults).toEqual({ memberRole: "REVIEWER" });
  });
});

describe("tasksResource lifecycle actions", () => {
  it("exposes pause, resume, and restricted delete actions", () => {
    const pause = tasksResource.actions?.find((item) => item.key === "pause");
    const resume = tasksResource.actions?.find((item) => item.key === "resume");
    const del = tasksResource.actions?.find((item) => item.key === "delete");

    expect(pause?.kind).toBe("request");
    expect(pause?.api).toBe("/api/v1/owner/tasks/{id}/pause");
    expect(pause?.visibleWhen).toEqual([{ field: "status", operator: "eq", value: "PUBLISHED" }]);

    expect(resume?.kind).toBe("request");
    expect(resume?.api).toBe("/api/v1/owner/tasks/{id}/publish");
    expect(resume?.visibleWhen).toEqual([{ field: "status", operator: "eq", value: "PAUSED" }]);

    expect(del?.visibleWhen).toEqual([{ field: "status", operator: "in", value: ["DRAFT", "PAUSED"] }]);
  });
});
