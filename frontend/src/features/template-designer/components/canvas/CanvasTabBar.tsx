"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Edit3, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDesignerEditorStore } from "../../stores/designer-editor-store";

export function CanvasTabBar() {
  const formSchema = useDesignerEditorStore((state) => state.formSchema);
  const activeSectionKey = useDesignerEditorStore((state) => state.activeSectionKey);
  const setActiveSectionKey = useDesignerEditorStore((state) => state.setActiveSectionKey);
  const addSection = useDesignerEditorStore((state) => state.addSection);
  const removeSection = useDesignerEditorStore((state) => state.removeSection);
  const updateSection = useDesignerEditorStore((state) => state.updateSection);
  const select = useDesignerEditorStore((state) => state.select);

  const [editingSectionKey, setEditingSectionKey] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSectionKey && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingSectionKey]);

  const handleConfirmRename = () => {
    if (editingSectionKey && editingTitle.trim()) {
      updateSection(editingSectionKey, { title: editingTitle.trim() });
    }
    setEditingSectionKey(null);
  };

  return (
    <div className="flex items-center gap-0 border-b border-border bg-muted px-2">
      <div className="flex items-center overflow-x-auto">
        {formSchema.sections.map((section) => (
          <div
            key={section.key}
            className={`group relative flex h-10 cursor-pointer items-center gap-1 border-b-2 px-3 py-1 text-sm transition-all
              ${
                activeSectionKey === section.key
                  ? "border-primary bg-card text-primary"
                  : "border-transparent text-muted-foreground hover:bg-background hover:text-foreground"
              }`}
            onClick={() => {
              setActiveSectionKey(section.key);
              select(section.key);
            }}
          >
            {editingSectionKey === section.key ? (
              <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                <Input
                  ref={inputRef}
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleConfirmRename();
                    } else if (event.key === "Escape") {
                      setEditingSectionKey(null);
                    }
                  }}
                  onBlur={handleConfirmRename}
                  className="h-6 w-28 px-2 py-1 text-sm"
                />
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleConfirmRename}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <span className="whitespace-nowrap">{section.title ?? section.key}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="invisible h-6 w-6 p-0 opacity-0 group-hover:visible group-hover:opacity-100"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="6" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="18" r="2" />
                      </svg>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-40">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingSectionKey(section.key);
                        setEditingTitle(section.title ?? section.key);
                      }}
                      className="cursor-pointer"
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      重命名
                    </DropdownMenuItem>
                    {formSchema.sections.length > 1 ? (
                      <DropdownMenuItem
                        onClick={() => removeSection(section.key)}
                        className="cursor-pointer text-red-600 dark:text-red-400"
                      >
                        <X className="mr-2 h-4 w-4" />
                        删除区块
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" size="icon" className="ml-1 h-8 w-8" onClick={() => addSection()}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
