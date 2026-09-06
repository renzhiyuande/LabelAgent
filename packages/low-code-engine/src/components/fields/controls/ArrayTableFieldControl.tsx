"use client";

import type { MouseEvent, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from '../../../components/ui/button';
import type { FormFieldSchema, FormMode } from "../../../schema/types";
import { isFormFieldDisabled, isFormFieldVisible } from "../../../utils/form-field-mode";
import { getValueAtPath, setValueAtPath } from "../../../utils/object-path";
import { hasPermission } from "../../../utils/permissions";
import type { AuthenticatedUser } from "../../../lib/types";

interface ArrayTableFieldControlProps {
  field: FormFieldSchema;
  path: string;
  items: Record<string, unknown>[];
  disabled?: boolean;
  formMode?: FormMode;
  currentUser?: AuthenticatedUser | null;
  renderCell: (args: {
    childField: FormFieldSchema;
    childPath: string;
    childValue: unknown;
    itemCtx: Record<string, unknown>;
    disabled: boolean;
    elementKey: string;
  }) => ReactNode;
  onItemsChange: (nextItems: Record<string, unknown>[]) => void;
}

function createEmptyArrayItem(childFields: FormFieldSchema[]): Record<string, unknown> {
  return childFields.reduce<Record<string, unknown>>((accumulator, childField) => {
    return setValueAtPath(accumulator, childField.path ?? childField.key, childField.defaultValue ?? "");
  }, {});
}

function moveArrayItem(
  items: Record<string, unknown>[],
  fromIndex: number,
  toIndex: number,
): Record<string, unknown>[] {
  if (fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function ArrayTableFieldControl({
  field,
  path,
  items,
  disabled = false,
  formMode = "create",
  currentUser = null,
  renderCell,
  onItemsChange,
}: ArrayTableFieldControlProps) {
  const childFields = (field.fields ?? []).filter(
    (childField) => hasPermission(currentUser, childField.permission) && !childField.hidden,
  );
  const isolateArrayButtonEvent = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  if (childFields.length === 0) {
    return <p className="lh-detail-empty-hint">未配置可编辑列</p>;
  }

  return (
    <div className="lh-array-table-field">
      <div className="lh-array-table-wrap">
        <div className="lh-array-table-scroll">
          <table className="lh-array-table">
            <thead>
              <tr>
                <th className="lh-array-table-index-col">#</th>
                {childFields.map((childField) => (
                  <th
                    key={childField.key}
                    className={
                      childField.component === "switch"
                        ? "lh-array-table-head--switch"
                        : childField.component === "textarea"
                          ? "lh-array-table-head--textarea"
                          : undefined
                    }
                  >
                    {childField.label}
                  </th>
                ))}
                <th className="lh-array-table-actions-col">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={childFields.length + 2} className="lh-array-table-empty">
                    暂无数据，点击下方按钮新增
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const itemCtx =
                    item && typeof item === "object" && !Array.isArray(item) ? item : {};
                  return (
                    <tr key={`${path}.${index}`}>
                      <td className="lh-array-table-index-col">{index + 1}</td>
                      {childFields.map((childField) => {
                        const childPath = `${path}.${index}.${childField.path ?? childField.key}`;
                        const childValue = getValueAtPath(itemCtx, childField.path ?? childField.key);
                        const cellHidden = !isFormFieldVisible(childField, formMode, itemCtx);
                        const cellDisabled =
                          disabled || cellHidden || isFormFieldDisabled(childField, formMode, itemCtx);

                        return (
                          <td
                            key={childField.key}
                            className={
                              childField.component === "switch"
                                ? "lh-array-table-cell lh-array-table-cell--switch"
                                : childField.component === "textarea"
                                  ? "lh-array-table-cell lh-array-table-cell--textarea"
                                  : "lh-array-table-cell"
                            }
                          >
                            {cellHidden ? (
                              <span className="lh-array-table-cell-placeholder">—</span>
                            ) : (
                              renderCell({
                                childField,
                                childPath,
                                childValue,
                                itemCtx,
                                disabled: cellDisabled,
                                elementKey: childPath,
                              })
                            )}
                          </td>
                        );
                      })}
                      <td className="lh-array-table-actions-col">
                        <div className="lh-array-table-row-actions">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="lh-array-table-move"
                            disabled={disabled || index === 0}
                            aria-label="上移"
                            title="上移"
                            onMouseDown={isolateArrayButtonEvent}
                            onClick={(event) => {
                              isolateArrayButtonEvent(event);
                              onItemsChange(moveArrayItem(items, index, index - 1));
                            }}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="lh-array-table-move"
                            disabled={disabled || index === items.length - 1}
                            aria-label="下移"
                            title="下移"
                            onMouseDown={isolateArrayButtonEvent}
                            onClick={(event) => {
                              isolateArrayButtonEvent(event);
                              onItemsChange(moveArrayItem(items, index, index + 1));
                            }}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="lh-array-table-delete"
                            disabled={disabled}
                            onMouseDown={isolateArrayButtonEvent}
                            onClick={(event) => {
                              isolateArrayButtonEvent(event);
                              onItemsChange(items.filter((_, itemIndex) => itemIndex !== index));
                            }}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        className="lh-array-table-add"
        onMouseDown={isolateArrayButtonEvent}
        onClick={(event) => {
          isolateArrayButtonEvent(event);
          onItemsChange([...items, createEmptyArrayItem(childFields)]);
        }}
      >
        新增一行
      </Button>
    </div>
  );
}
