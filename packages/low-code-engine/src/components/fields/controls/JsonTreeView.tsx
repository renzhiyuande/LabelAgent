"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../../../lib/utils";
import {
  formatJsonPrimitive,
  getJsonPrimitiveKind,
  isJsonExpandable,
  jsonNodePreview,
  resolveJsonTreeExpansion,
  type JsonTreeExpansionMode,
} from "./json-editor-support";

interface JsonTreeNodeProps {
  path: string;
  label?: string | number;
  value: unknown;
  depth: number;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}

function JsonTreeNode({ path, label, value, depth, expanded, onToggle }: JsonTreeNodeProps) {
  const expandable = isJsonExpandable(value);
  const isExpanded = expanded.has(path);

  if (!expandable) {
    const kind = getJsonPrimitiveKind(value);
    return (
      <div className="lh-json-tree-row" style={{ paddingLeft: `${depth * 16}px` }}>
        {label !== undefined ? (
          <>
            <span className="lh-json-tree-key">{String(label)}</span>
            <span className="lh-json-tree-colon">: </span>
          </>
        ) : null}
        <span className={cn("lh-json-tree-value", `lh-json-tree-value--${kind}`)}>
          {formatJsonPrimitive(value)}
        </span>
      </div>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((entry, index) => [index, entry] as const)
    : Object.entries(value as Record<string, unknown>);

  return (
    <div className="lh-json-tree-node">
      <div className="lh-json-tree-row" style={{ paddingLeft: `${depth * 16}px` }}>
        <button
          type="button"
          className="lh-json-tree-toggle"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "收起节点" : "展开节点"}
          onClick={() => onToggle(path)}
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {label !== undefined ? (
          <>
            <span className="lh-json-tree-key">{String(label)}</span>
            <span className="lh-json-tree-colon">: </span>
          </>
        ) : null}
        <span className="lh-json-tree-preview">{jsonNodePreview(value)}</span>
      </div>
      {isExpanded
        ? entries.map(([entryKey, entryValue]) => (
            <JsonTreeNode
              key={`${path}.${String(entryKey)}`}
              path={`${path}.${String(entryKey)}`}
              label={entryKey}
              value={entryValue}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))
        : null}
    </div>
  );
}

export interface JsonTreeViewProps {
  value: unknown;
  expansionMode?: JsonTreeExpansionMode;
  emptyHint?: string;
  className?: string;
}

export function JsonTreeView({
  value,
  expansionMode = "default",
  emptyHint = "暂无 JSON 内容",
  className,
}: JsonTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => resolveJsonTreeExpansion(value, expansionMode));

  useEffect(() => {
    setExpanded(resolveJsonTreeExpansion(value, expansionMode));
  }, [value, expansionMode]);

  const hasContent = useMemo(() => {
    if (value === undefined || value === "") {
      return false;
    }
    if (value === null) {
      return true;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    return true;
  }, [value]);

  function handleToggle(path: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  if (!hasContent) {
    return <p className="lh-json-tree-empty">{emptyHint}</p>;
  }

  return (
    <div className={cn("lh-json-tree", className)}>
      <JsonTreeNode path="root" value={value} depth={0} expanded={expanded} onToggle={handleToggle} />
    </div>
  );
}
