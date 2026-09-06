"use client";

import { ArrowDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  REVIEW_WORKFLOW_ACTION_OPTIONS,
  type ReviewWorkflowAction,
  type ReviewWorkflowLevelItem,
} from "../review-workflow-types";
import { createNextWorkflowLevel } from "../review-workflow-utils";

interface ReviewWorkflowEditorProps {
  levels: ReviewWorkflowLevelItem[];
  editable: boolean;
  onChange: (levels: ReviewWorkflowLevelItem[]) => void;
}

function patchLevel(
  levels: ReviewWorkflowLevelItem[],
  index: number,
  patch: Partial<ReviewWorkflowLevelItem>,
): ReviewWorkflowLevelItem[] {
  return levels.map((level, levelIndex) => (levelIndex === index ? { ...level, ...patch } : level));
}

export function ReviewWorkflowEditor({ levels, editable, onChange }: ReviewWorkflowEditorProps) {
  const canAddLevel = editable && levels.length < 5;

  const handleToggleAction = (index: number, action: ReviewWorkflowAction, checked: boolean) => {
    const current = levels[index];
    const nextActions = checked
      ? [...current.actions, action]
      : current.actions.filter((item) => item !== action);
    onChange(patchLevel(levels, index, { actions: nextActions }));
  };

  const handleAddLevel = () => {
    const next = createNextWorkflowLevel(levels);
    if (!next) {
      return;
    }
    onChange([...levels, next]);
  };

  const handleRemoveLevel = (index: number) => {
    if (levels.length <= 1) {
      return;
    }
    const next = levels
      .filter((_, levelIndex) => levelIndex !== index)
      .map((level, levelIndex) => ({
        ...level,
        key: `L${levelIndex + 1}`,
      }));
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">人工审核流程</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            配置初审/复审/终审等级与每级可用操作，发布模板或任务后审核员按此流程处理。
          </p>
        </div>
        {canAddLevel ? (
          <Button type="button" variant="outline" size="sm" onClick={handleAddLevel}>
            <Plus className="mr-1 h-4 w-4" />
            增加一级
          </Button>
        ) : null}
      </div>

      <div className="max-h-[min(240px,32vh)] space-y-3 overflow-y-auto overscroll-contain pr-1">
        {levels.map((level, index) => (
          <div
            key={`${level.key}-${index}`}
            className="rounded-lg border border-border bg-muted/60 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>{level.key}</span>
                {index < levels.length - 1 ? <ArrowDown className="h-3.5 w-3.5" /> : null}
              </div>
              {editable && levels.length > 1 ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveLevel(index)}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  删除
                </Button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">展示名称</label>
                <Input
                  value={level.label}
                  disabled={!editable}
                  placeholder="初审"
                  onChange={(event) => onChange(patchLevel(levels, index, { label: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">可用操作</label>
                <div className="flex flex-wrap gap-3">
                  {REVIEW_WORKFLOW_ACTION_OPTIONS.map((option) => {
                    const checked = level.actions.includes(option.id);
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "inline-flex items-center gap-2 text-sm text-foreground",
                          !editable && "opacity-70",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!editable}
                          onCheckedChange={(value) =>
                            handleToggleAction(index, option.id, value === true)
                          }
                        />
                        {option.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
