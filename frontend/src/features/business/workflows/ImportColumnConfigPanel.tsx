import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  guessDefaultComponent,
  IMPORT_BINDABLE_COMPONENTS,
  type ImportColumnConfig,
  type ImportColumnRole,
} from "../utils/infer-form-schema-from-import";
import type { FormFieldComponent } from "@/low-code/schema/types";

const ROLE_OPTIONS: Array<{ value: ImportColumnRole; label: string }> = [
  { value: "display", label: "展示（只读）" },
  { value: "input", label: "输入（标注）" },
  { value: "ignore", label: "忽略" },
];

interface ImportColumnConfigPanelProps {
  configs: ImportColumnConfig[];
  items: Array<Record<string, unknown>>;
  onChange: (configs: ImportColumnConfig[]) => void;
}

function sampleValuesForKey(items: Array<Record<string, unknown>>, key: string): unknown[] {
  const out: unknown[] = [];
  for (const item of items) {
    const value = item[key];
    if (value !== undefined && value !== null) {
      out.push(value);
    }
    if (out.length >= 50) {
      break;
    }
  }
  return out;
}

export function ImportColumnConfigPanel({ configs, items, onChange }: ImportColumnConfigPanelProps) {
  function patchConfig(key: string, patch: Partial<ImportColumnConfig>) {
    onChange(configs.map((config) => (config.key === key ? { ...config, ...patch } : config)));
  }

  function patchRole(key: string, role: ImportColumnRole) {
    const samples = sampleValuesForKey(items, key);
    onChange(
      configs.map((config) => {
        if (config.key !== key) {
          return config;
        }
        if (role === "ignore") {
          return { ...config, role };
        }
        return {
          ...config,
          role,
          component: guessDefaultComponent(key, role, samples),
        };
      }),
    );
  }

  function setAllRole(role: ImportColumnRole) {
    onChange(
      configs.map((config) => {
        if (role === "ignore") {
          return { ...config, role };
        }
        const samples = sampleValuesForKey(items, config.key);
        return {
          ...config,
          role,
          component: guessDefaultComponent(config.key, role, samples),
        };
      }),
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">字段绑定（生成模板）</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="text-xs text-sky-600 hover:underline dark:text-sky-400"
            onClick={() => setAllRole("display")}
          >
            全部展示
          </button>
          <button
            type="button"
            className="text-xs text-sky-600 hover:underline dark:text-sky-400"
            onClick={() => setAllRole("input")}
          >
            全部输入
          </button>
        </div>
      </div>
      <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
        <table className="min-w-full border-collapse text-sm text-slate-900 dark:text-slate-100">
          <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-medium dark:border-slate-700">
                字段（表头）
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-medium dark:border-slate-700">
                用途
              </th>
              <th className="min-w-[140px] border-b border-slate-200 px-3 py-2 text-left font-medium dark:border-slate-700">
                绑定组件
              </th>
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => {
              const disabled = config.role === "ignore";
              return (
                <tr
                  key={config.key}
                  className="odd:bg-white even:bg-slate-50/40 dark:odd:bg-slate-950 dark:even:bg-slate-900/50"
                >
                  <td className="border-b border-slate-100 px-3 py-2 font-mono text-xs dark:border-slate-800">
                    {config.key}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                    <Select
                      value={config.role}
                      onValueChange={(value) => patchRole(config.key, value as ImportColumnRole)}
                    >
                      <SelectTrigger className="h-8 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                    <Select
                      value={config.component}
                      disabled={disabled}
                      onValueChange={(value) => patchConfig(config.key, { component: value as FormFieldComponent })}
                    >
                      <SelectTrigger className="h-8 rounded-lg text-xs">
                        <SelectValue placeholder="选择组件" />
                      </SelectTrigger>
                      <SelectContent>
                        {IMPORT_BINDABLE_COMPONENTS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        「用途」为忽略时不生成字段；展示/输入均可单独指定组件类型，选项类组件会从样本值自动推断选项。
      </p>
    </div>
  );
}
