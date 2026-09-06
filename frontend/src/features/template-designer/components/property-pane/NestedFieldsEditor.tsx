"use client";

import { ArrowRightCircle } from "lucide-react";
import type { FormFieldSchema } from "@/low-code/schema/types";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";
import { Button } from "@/components/ui/button";

interface NestedFieldsEditorProps {
  parentField: FormFieldSchema;
}

export function NestedFieldsEditor({ parentField }: NestedFieldsEditorProps) {
  const enterArrayScope = useDesignerEditorStore((state) => state.enterArrayScope);
  const children = parentField.fields ?? [];

  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">array 子字段</h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          进入子画布后，复用主画布的拖拽与属性编辑体验。
        </p>
      </div>
      <div className="rounded-lg border border-border bg-muted/80 p-3">
        <p className="text-sm text-slate-700 dark:text-slate-200">
          当前已配置子字段：<span className="font-semibold">{children.length}</span> 个
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          点击进入子画布后，可像主画布一样拖拽新增、排序并编辑属性。
        </p>
        <div className="mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => enterArrayScope(parentField.key)}
          >
            <ArrowRightCircle className="mr-1.5 h-4 w-4" />
            进入子画布
          </Button>
        </div>
      </div>
    </section>
  );
}
