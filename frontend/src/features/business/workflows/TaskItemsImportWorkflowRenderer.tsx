import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  CheckCircle2,
  Download,
  LayoutTemplate,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { appMessage } from "../../../lib/message";
import type { WorkflowRendererProps } from "@/low-code/actions/workflow-registry";
import type { ResourceRecord } from "@/low-code/types";
import { request } from "../../../utils/apiClient";
import {
  buildDefaultColumnConfigs,
  buildFormSchemaFromImport,
  collectImportColumnKeys,
  countActiveColumns,
  type ImportColumnConfig,
} from "../utils/infer-form-schema-from-import";
import {
  loadTaskImportTemplateContext,
  resolveTaskTemplateId,
  saveImportGeneratedTemplateDraft,
  type TaskImportTemplateContext,
} from "../utils/import-template-draft";
import {
  buildColumnBindings,
  buildContractFromColumnConfigs,
  type TaskImportPayloadContract,
} from "../utils/import-payload-contract";
import { validateImportItemsAgainstContract } from "../utils/import-schema-validation";
import {
  CONTENT_HASH_SOURCE_KEY,
  describeSourceKeyField,
  detectDefaultSourceKeyField,
  requiresExplicitSourceKeySelection,
} from "../utils/import-source-key";
import { ImportColumnConfigPanel } from "./ImportColumnConfigPanel";
import { appendDesignerReturnTo } from "../../template-designer/hooks/use-designer-back";
import {
  downloadImportTemplateJson,
  resolveDownloadImportContract,
} from "../utils/download-import-template";

interface TaskItemImportBatchSummary {
  id: string;
  taskId: string;
  sourceFilename: string;
  sourceFormat: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedRows?: number;
  importStatus: string;
  startedAt: string;
  finishedAt: string;
}

interface ParsedImportPayload {
  sourceFilename: string;
  items: Array<Record<string, unknown>>;
  previewItems: Array<Record<string, unknown>>;
  previewTruncated: boolean;
}

type InputMode = "file" | "text";

const PREVIEW_ROW_LIMIT = 20;
const PREVIEW_COLUMN_LIMIT = 10;

function parseTaskItemsJson(raw: string, sourceFilename: string): ParsedImportPayload {
  if (!raw.trim()) {
    throw new Error("请输入 JSON 数组内容");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("JSON 格式错误，请检查后重试");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("JSON 内容必须是数组");
  }
  if (parsed.length === 0) {
    throw new Error("导入数据不能为空数组");
  }
  const items = parsed.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`第 ${index + 1} 条不是有效对象`);
    }
    return item as Record<string, unknown>;
  });
  return {
    sourceFilename: sourceFilename.trim() || "manual-input.json",
    items,
    previewItems: items.slice(0, PREVIEW_ROW_LIMIT),
    previewTruncated: items.length > PREVIEW_ROW_LIMIT,
  };
}

function buildPreviewHeaders(items: Array<Record<string, unknown>>): string[] {
  return collectImportColumnKeys(items).slice(0, PREVIEW_COLUMN_LIMIT);
}

function formatCell(value: unknown): string {
  if (value == null) {
    return "-";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function resolveTaskId(record?: ResourceRecord | null, scopeValue?: string | number): string {
  const byScope = scopeValue == null ? "" : String(scopeValue);
  if (byScope) {
    return byScope;
  }
  const byRecord = record?.taskId ?? record?.id;
  return byRecord == null ? "" : String(byRecord);
}

export function TaskItemsImportWorkflowRenderer({
  record,
  scope,
  close,
  refresh,
}: WorkflowRendererProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<InputMode>("file");
  const [filename, setFilename] = useState("");
  const [textValue, setTextValue] = useState("");
  const [parsedPayload, setParsedPayload] = useState<ParsedImportPayload | null>(null);
  const [columnConfigs, setColumnConfigs] = useState<ImportColumnConfig[]>([]);
  const [openDesignerAfter, setOpenDesignerAfter] = useState(false);
  const [templateContext, setTemplateContext] = useState<TaskImportTemplateContext | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(true);
  const [sourceKeyField, setSourceKeyField] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<TaskItemImportBatchSummary | null>(null);
  const [generatedTemplateId, setGeneratedTemplateId] = useState<string | null>(null);
  const [generatedVersionId, setGeneratedVersionId] = useState<string | null>(null);

  const taskId = resolveTaskId(record, scope?.value);
  const hasBoundTemplate = Boolean(templateContext?.hasTemplate);
  const designerReturnTo = `${location.pathname}${location.search}`;

  function openDesigner(templateId: string, versionId: string) {
    navigate(
      appendDesignerReturnTo(
        `/system/template-designer?templateId=${encodeURIComponent(templateId)}&versionId=${encodeURIComponent(versionId)}`,
        designerReturnTo,
      ),
    );
    close();
  }

  useEffect(() => {
    if (!taskId) {
      setTemplateContext(null);
      setLoadingTemplate(false);
      return;
    }
    let active = true;
    setLoadingTemplate(true);
    void loadTaskImportTemplateContext(taskId)
      .then((context) => {
        if (active) {
          setTemplateContext(context);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingTemplate(false);
        }
      });
    return () => {
      active = false;
    };
  }, [taskId]);

  const previewHeaders = useMemo(
    () => buildPreviewHeaders(parsedPayload?.previewItems ?? []),
    [parsedPayload?.previewItems],
  );
  const columnCounts = useMemo(() => countActiveColumns(columnConfigs), [columnConfigs]);
  const allPreviewColumns = useMemo(
    () => (parsedPayload ? collectImportColumnKeys(parsedPayload.items) : []),
    [parsedPayload],
  );
  const detectedSourceKey = useMemo(
    () => (parsedPayload ? detectDefaultSourceKeyField(parsedPayload.items) : null),
    [parsedPayload],
  );
  const mustSelectSourceKey = useMemo(
    () => (parsedPayload ? requiresExplicitSourceKeySelection(parsedPayload.items) : false),
    [parsedPayload],
  );
  const canSubmitImport = Boolean(parsedPayload && sourceKeyField && !loadingTemplate);
  const downloadContract = useMemo((): TaskImportPayloadContract | null => {
    const fromTemplate = resolveDownloadImportContract(templateContext);
    if (fromTemplate) {
      return fromTemplate;
    }
    if (!hasBoundTemplate && columnConfigs.length > 0) {
      return buildContractFromColumnConfigs(columnConfigs);
    }
    return null;
  }, [templateContext, hasBoundTemplate, columnConfigs]);

  function handleDownloadImportTemplate() {
    if (!downloadContract) {
      appMessage.info("暂无可下载的导入模板，请先绑定标注模板或解析文件并配置字段");
      return;
    }
    downloadImportTemplateJson(downloadContract, `task-${taskId}-import-template.json`);
  }

  useEffect(() => {
    if (!parsedPayload || hasBoundTemplate) {
      setColumnConfigs([]);
      return;
    }
    setColumnConfigs(buildDefaultColumnConfigs(parsedPayload.items));
  }, [parsedPayload, hasBoundTemplate]);

  function resolveActiveImportContract(): TaskImportPayloadContract | null {
    if (templateContext?.importContract) {
      return templateContext.importContract;
    }
    if (!hasBoundTemplate && columnConfigs.length > 0) {
      return buildContractFromColumnConfigs(columnConfigs);
    }
    return null;
  }

  function validateItemsAgainstContract(items: Array<Record<string, unknown>>): string | null {
    const contract = resolveActiveImportContract();
    if (!contract) {
      return null;
    }
    const result = validateImportItemsAgainstContract(items, contract);
    return result.ok ? null : result.message ?? "导入字段与任务导入契约不一致";
  }

  function resetState() {
    setMode("file");
    setFilename("");
    setTextValue("");
    setParsedPayload(null);
    setColumnConfigs([]);
    setOpenDesignerAfter(false);
    setSourceKeyField(null);
    setParseError(null);
    setImportResult(null);
    setGeneratedTemplateId(null);
    setGeneratedVersionId(null);
    setSubmitting(false);
  }

  function parseFromRaw(raw: string, sourceName: string) {
    try {
      const parsed = parseTaskItemsJson(raw, sourceName);
      const schemaError = validateItemsAgainstContract(parsed.items);
      if (schemaError) {
        setParsedPayload(null);
        setColumnConfigs([]);
        setImportResult(null);
        setParseError(schemaError);
        return;
      }
      setParsedPayload(parsed);
      setSourceKeyField(detectDefaultSourceKeyField(parsed.items));
      setParseError(null);
      setImportResult(null);
      setGeneratedTemplateId(null);
      setGeneratedVersionId(null);
    } catch (error) {
      setParsedPayload(null);
      setColumnConfigs([]);
      setSourceKeyField(null);
      setImportResult(null);
      setParseError(error instanceof Error ? error.message : "解析失败，请检查内容");
    }
  }

  async function handleImport() {
    if (!parsedPayload || !taskId) {
      return;
    }

    const schemaError = validateItemsAgainstContract(parsedPayload.items);
    if (schemaError) {
      appMessage.error(schemaError);
      setParseError(schemaError);
      return;
    }

    if (!sourceKeyField) {
      appMessage.info(mustSelectSourceKey ? "请选择去重标识列，或改用按行内容 SHA256" : "去重标识未配置");
      return;
    }

    if (!hasBoundTemplate) {
      if (columnCounts.input === 0 && columnCounts.display === 0) {
        appMessage.info("请至少为一个字段选择「展示」或「输入」");
        return;
      }
      if (columnCounts.input === 0) {
        appMessage.info("生成模板时建议至少保留一个「输入」字段供标注提交");
      }
    }

    setSubmitting(true);
    try {
      const result = await request<TaskItemImportBatchSummary>(
        `/api/v1/owner/tasks/${encodeURIComponent(taskId)}/items`,
        {
          method: "POST",
          body: JSON.stringify({
            sourceFilename: parsedPayload.sourceFilename,
            items: parsedPayload.items,
            sourceKeyField,
            columnBindings:
              columnConfigs.length > 0 ? buildColumnBindings(columnConfigs) : undefined,
          }),
        },
      );
      setImportResult(result);
      await refresh();

      const skipped = result.skippedRows ?? 0;
      if (!hasBoundTemplate) {
        const formSchema = buildFormSchemaFromImport(parsedPayload.items, columnConfigs);
        const templateId = await resolveTaskTemplateId(taskId, {
          title: typeof record?.title === "string" ? record.title : undefined,
          taskCode: typeof record?.taskCode === "string" ? record.taskCode : undefined,
          sceneCode: typeof record?.sceneCode === "string" ? record.sceneCode : undefined,
        });
        const versionId = await saveImportGeneratedTemplateDraft(templateId, formSchema);
        setGeneratedTemplateId(templateId);
        setGeneratedVersionId(versionId);
        const importContract = buildContractFromColumnConfigs(columnConfigs);
        setTemplateContext({
          hasTemplate: true,
          templateId,
          payloadKeys: importContract
            ? [...importContract.requiredKeys, ...importContract.optionalKeys]
            : collectImportColumnKeys(parsedPayload.items),
          importContract,
          formSchema,
        });
        if (openDesignerAfter) {
          openDesigner(templateId, versionId);
          return;
        }
      }
    } catch (error) {
      appMessage.errorFrom(error, "导入失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (!taskId) {
    return (
      <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
        缺少 taskId，无法执行导入。
      </div>
    );
  }

  if (importResult) {
    const skipped = importResult.skippedRows ?? 0;
    const hasFailures = importResult.failedRows > 0;
    const allSkipped = importResult.successRows === 0 && skipped > 0;
    const freshlyGeneratedTemplate = Boolean(generatedTemplateId && generatedVersionId);

    return (
      <div className="flex min-h-[min(420px,70vh)] flex-col items-center justify-center px-2 py-6 text-center">
        <div
          className={`mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
            hasFailures
              ? "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
              : allSkipped
                ? "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
          }`}
        >
          {hasFailures ? (
            <XCircle className="h-9 w-9" aria-hidden />
          ) : (
            <CheckCircle2 className="h-9 w-9" aria-hidden />
          )}
        </div>

        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
          {hasFailures
            ? "导入未完全成功"
            : allSkipped
              ? "未新增数据"
              : freshlyGeneratedTemplate
                ? "导入完成，已生成模板草稿"
                : "导入完成"}
        </h3>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {hasFailures
            ? "部分数据导入失败，请检查文件后重新导入。"
            : allSkipped
              ? "所选数据均已存在，未写入新数据项。"
              : freshlyGeneratedTemplate
                ? "数据已写入，并已根据字段配置生成标注模板草稿。你可以现在去微调模板，或先继续导入更多数据。"
                : "数据已成功写入当前任务。"}
        </p>

        <div className="mt-8 grid w-full max-w-lg grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-200">
          <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">成功导入</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
              {importResult.successRows}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">跳过重复</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{skipped}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">失败</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-600 dark:text-rose-300">
              {importResult.failedRows}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500 dark:text-slate-400">来源文件</p>
            <p className="mt-1 truncate text-sm font-medium" title={importResult.sourceFilename}>
              {importResult.sourceFilename}
            </p>
          </div>
        </div>

        {freshlyGeneratedTemplate ? (
          <div className="mt-8 w-full max-w-md space-y-3 rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-4 text-left dark:border-violet-900/50 dark:bg-violet-950/30">
            <p className="text-sm font-medium text-violet-900 dark:text-violet-100">下一步请选择</p>
            <p className="text-xs text-violet-800/90 dark:text-violet-200/80">
              模板草稿已保存，可在任务行的「模板管理」中随时查看或打开设计器。
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                type="button"
                size="lg"
                className="h-11 w-full"
                onClick={() => openDesigner(generatedTemplateId!, generatedVersionId!)}
              >
                <LayoutTemplate className="h-4 w-4" />
                编辑模板
              </Button>
              <Button type="button" variant="outline" size="lg" className="h-11 w-full" onClick={resetState}>
                <RotateCcw className="h-4 w-4" />
                继续导入数据
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="h-10 w-full"
                onClick={() => {
                  resetState();
                  close();
                }}
              >
                关闭
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-11 flex-1"
              onClick={() => {
                resetState();
                close();
              }}
            >
              返回
            </Button>
            <Button type="button" size="lg" className="h-11 flex-1" onClick={resetState}>
              <RotateCcw className="h-4 w-4" />
              重新导入
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loadingTemplate ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">正在加载任务模板信息…</p>
      ) : hasBoundTemplate ? (
        <div className="rounded-md border border-sky-100 bg-sky-50/80 px-3 py-2 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium">已绑定标注模板{templateContext?.versionNo ? `（v${templateContext.versionNo}）` : ""}</p>
            {downloadContract ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={handleDownloadImportTemplate}
              >
                <Download className="h-3.5 w-3.5" />
                下载导入模板
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-sky-800/90 dark:text-sky-200/80">
            本次仅导入数据，不会生成新模板。必填题目列：
            {(downloadContract?.requiredKeys ?? []).join("、") || "—"}；可选列：
            {(downloadContract?.optionalKeys ?? []).join("、") || "无"}。文件列须包含全部必填列，且不得超出允许范围（模板中的
            LLM 等运行时字段无需出现在文件中）。
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-violet-100 bg-violet-50/60 px-3 py-2 text-sm text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-100">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p>
              首次导入将按下方字段配置锁定「题目列（展示）」并生成模板草稿；再次导入须满足已锁定的导入契约（展示列必填，输入列可选，不可出现未允许的列）。
            </p>
            {downloadContract ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={handleDownloadImportTemplate}
              >
                <Download className="h-3.5 w-3.5" />
                下载导入模板
              </Button>
            ) : null}
          </div>
        </div>
      )}

      <Tabs value={mode} onValueChange={(value) => setMode(value as InputMode)}>
        <TabsList>
          <TabsTrigger value="file">上传文件</TabsTrigger>
          <TabsTrigger value="text">粘贴 JSON</TabsTrigger>
        </TabsList>
        <TabsContent value="file" className="space-y-3">
          <Input
            type="file"
            accept=".json,application/json"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) {
                return;
              }
              setFilename(file.name);
              file.text().then((raw) => parseFromRaw(raw, file.name)).catch(() => {
                setParseError("读取文件失败，请重试");
              });
            }}
          />
          {filename ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">当前文件：{filename}</p>
          ) : null}
        </TabsContent>
        <TabsContent value="text" className="space-y-3">
          <Input
            value={filename}
            placeholder="源文件名（选填，例如 items.json）"
            onChange={(event) => setFilename(event.target.value)}
          />
          <Textarea
            value={textValue}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder='请输入 JSON 数组，例如 [{"id":"P0001","prompt":"..."}]'
          />
          <Button type="button" variant="outline" onClick={() => parseFromRaw(textValue, filename || "manual-input.json")}>
            解析内容
          </Button>
        </TabsContent>
      </Tabs>

      {parseError ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
          {parseError}
        </p>
      ) : null}

      {parsedPayload ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">总条数 {parsedPayload.items.length}</Badge>
            <Badge variant="secondary">字段 {allPreviewColumns.length}</Badge>
            {parsedPayload.previewTruncated ? <Badge variant="warning">预览仅前 {PREVIEW_ROW_LIMIT} 条</Badge> : null}
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/40">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">去重标识</p>
            {detectedSourceKey && sourceKeyField === detectedSourceKey ? (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                已自动识别默认 ID 列：<span className="font-mono">{detectedSourceKey}</span>（同任务内相同 ID 或相同内容将跳过）
              </p>
            ) : null}
            {mustSelectSourceKey ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                未识别到 id / Id / ID 等默认列，请手动选择业务 ID 列，或改用「按行内容 SHA256」。
              </p>
            ) : null}
            <Select
              value={sourceKeyField ?? undefined}
              onValueChange={(value) => setSourceKeyField(value)}
            >
              <SelectTrigger className="h-9 w-full max-w-md">
                <SelectValue placeholder="选择去重标识列（必填）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CONTENT_HASH_SOURCE_KEY}>按行内容 SHA256（稳定 JSON 序列化）</SelectItem>
                {allPreviewColumns.map((key) => (
                  <SelectItem key={key} value={key}>
                    列：{key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sourceKeyField ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                当前策略：{describeSourceKeyField(sourceKeyField)}
              </p>
            ) : null}
          </div>

          {!hasBoundTemplate ? (
            <>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900"
                  checked={openDesignerAfter}
                  onChange={(event) => setOpenDesignerAfter(event.target.checked)}
                />
                生成模板后打开模板设计器微调
              </label>
              <ImportColumnConfigPanel
                configs={columnConfigs}
                items={parsedPayload.items}
                onChange={setColumnConfigs}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                将生成：展示 {columnCounts.display} 项 · 输入 {columnCounts.input} 项 · 忽略{" "}
                {columnConfigs.length - columnCounts.display - columnCounts.input} 项
              </p>
            </>
          ) : null}

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="min-w-full border-collapse text-sm text-slate-900 dark:text-slate-100">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 text-left dark:border-slate-700">#</th>
                  {previewHeaders.map((header) => (
                    <th
                      key={header}
                      className="border-b border-slate-200 px-3 py-2 text-left dark:border-slate-700"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedPayload.previewItems.map((item, index) => (
                  <tr
                    key={`${index}-${String(item.id ?? item.sourceItemKey ?? "")}`}
                    className="odd:bg-white even:bg-slate-50/30 dark:odd:bg-slate-950 dark:even:bg-slate-900/50"
                  >
                    <td className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">{index + 1}</td>
                    {previewHeaders.map((header) => (
                      <td
                        key={`${header}-${index}`}
                        className="max-w-[260px] truncate border-b border-slate-100 px-3 py-2 dark:border-slate-800"
                      >
                        {formatCell(item[header])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {allPreviewColumns.length > PREVIEW_COLUMN_LIMIT ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              预览表仅显示前 {PREVIEW_COLUMN_LIMIT} 列，字段配置表含全部列。
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!downloadContract}
          onClick={handleDownloadImportTemplate}
        >
          <Download className="h-4 w-4" />
          下载导入模板
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetState();
            close();
          }}
        >
          关闭
        </Button>
        <Button
          type="button"
          disabled={!canSubmitImport || submitting}
          onClick={() => void handleImport()}
        >
          {submitting ? "处理中..." : hasBoundTemplate ? "确认导入" : "导入并生成模板"}
        </Button>
      </div>
    </div>
  );
}
