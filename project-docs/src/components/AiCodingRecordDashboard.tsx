import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";

import styles from "./AiCodingRecordDashboard.module.css";

type SessionIndexEntry = {
  project: string;
  date: string;
  session_id: string;
  modified_at: string;
  top_stage: string;
  stages: string[];
  tracks: string[];
  module_tags: string[];
  selected_prompt_count: number;
  prompt_preview: string;
  path: string;
};

type SessionIndex = {
  scope: string;
  count: number;
  sessions: SessionIndexEntry[];
};

type ConversationTurn = {
  order: number;
  role: "user" | "assistant";
  display_text?: string | null;
  summary_text?: string | null;
  text_snippet?: string | null;
  raw_text?: string | null;
  selected?: boolean;
  quality_level?: string;
  prompt_kind?: string | null;
  tool_names?: string[];
  file_paths?: string[];
  display_strategy?: string | null;
};

type ConversationSession = {
  project: string;
  session_id: string;
  date: string;
  modified_at: string;
  top_stage: string;
  stages: string[];
  tracks: string[];
  module_tags: string[];
  key_topics: string[];
  tool_usage: string[];
  models_used: string[];
  selected_prompt_count: number;
  turns: ConversationTurn[];
};

type RecordSummary = {
  session_count: number;
  narrative_session_count: number;
  selected_prompt_count: number;
  projects: Record<string, number>;
  models_observed: string[];
};

type ViewMode = "sessions" | "modules" | "stages" | "stats";
type ChatMode = "focused" | "full";

const STAGE_ORDER = ["design", "development", "iteration", "maintenance", "uncategorized"];

function stageLabel(stage: string): string {
  if (stage === "design") return "设计";
  if (stage === "development") return "开发";
  if (stage === "iteration") return "迭代";
  if (stage === "maintenance") return "维护";
  return "未归类";
}

function trackLabel(track: string): string {
  if (track === "system_infrastructure") return "系统基建";
  if (track === "business_development") return "业务开发";
  return "未归类";
}

function sessionKey(entry: Pick<SessionIndexEntry, "project" | "session_id">): string {
  return `${entry.project}:${entry.session_id}`;
}

function matchesFilters(
  entry: SessionIndexEntry,
  search: string,
  stageFilter: string,
  moduleFilter: string,
): boolean {
  const query = search.trim().toLowerCase();
  if (stageFilter !== "all" && entry.top_stage !== stageFilter) {
    return false;
  }
  if (moduleFilter !== "all" && !entry.module_tags.includes(moduleFilter)) {
    return false;
  }
  if (!query) {
    return true;
  }
  const haystack = [
    entry.project,
    entry.session_id,
    entry.prompt_preview,
    entry.modified_at,
    entry.top_stage,
    ...entry.module_tags,
    ...entry.tracks,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function cleanTurnText(text: string | null | undefined): string {
  if (!text) {
    return "";
  }
  return text
    .replace(/<timestamp>[\s\S]*?<\/timestamp>/gi, "")
    .replace(/<\/?user_query>/gi, "")
    .replace(/^\[摘要\]$/g, "")
    .trim();
}

function turnTextContent(turn: ConversationTurn): string {
  return cleanTurnText(turn.display_text || turn.raw_text || turn.text_snippet || turn.summary_text || "");
}

function isToolOnlyTurn(turn: ConversationTurn): boolean {
  return turn.role === "assistant" && !turnTextContent(turn) && Boolean(turn.tool_names?.length);
}


function isMeaningfulAssistant(turn: ConversationTurn): boolean {
  const text = turnTextContent(turn);
  if (!text || text === "[摘要]") {
    return false;
  }
  if (hasChinese(text) && text.length >= 20) {
    return true;
  }
  return text.length >= 64;
}

function shouldShowTurnInFull(turn: ConversationTurn): boolean {
  if (turn.role === "user") {
    return Boolean(turn.selected) || (turn.quality_level !== "low" && Boolean(turnTextContent(turn)));
  }
  return isMeaningfulAssistant(turn);
}

function hasDisplayableBody(turn: ConversationTurn): boolean {
  if (isToolOnlyTurn(turn)) {
    return false;
  }
  const body = cleanTurnText(turnBody(turn));
  if (!body) {
    return false;
  }
  if (body === "[无文本]") {
    return false;
  }
  if (turn.role === "user" && !turn.selected && body === "[摘要]") {
    return Boolean(cleanTurnText(turn.summary_text || turn.display_text || turn.text_snippet));
  }
  return true;
}

function buildFocusedTurns(turns: ConversationTurn[]): ConversationTurn[] {
  const selectedIndexes = turns
    .map((turn, index) => ({ turn, index }))
    .filter(({ turn }) => turn.role === "user" && turn.selected);

  if (selectedIndexes.length === 0) {
    return turns.filter((turn) => shouldShowTurnInFull(turn)).slice(0, 24);
  }

  const result: ConversationTurn[] = [];
  selectedIndexes.forEach(({ index }) => {
    result.push(turns[index]);
    let meaningfulCount = 0;
    for (let cursor = index + 1; cursor < turns.length; cursor += 1) {
      const next = turns[cursor];
      if (next.role === "user") {
        break;
      }
      if (isToolOnlyTurn(next) || !isMeaningfulAssistant(next)) {
        continue;
      }
      result.push(next);
      meaningfulCount += 1;
      if (meaningfulCount >= 2) {
        break;
      }
    }
  });
  return result.filter(hasDisplayableBody);
}

function collapseToolRuns(turns: ConversationTurn[]): ConversationTurn[] {
  const result: ConversationTurn[] = [];
  let pendingTools: ConversationTurn[] = [];

  const flushTools = () => {
    if (pendingTools.length === 0) {
      return;
    }
    const tools = Array.from(new Set(pendingTools.flatMap((turn) => turn.tool_names || [])));
    result.push({
      order: pendingTools[0].order,
      role: "assistant",
      display_text: `${pendingTools.length} 次工具调用：${tools.join(" · ")}`,
      tool_names: tools,
      selected: false,
      quality_level: "low",
    });
    pendingTools = [];
  };

  turns.forEach((turn) => {
    if (isToolOnlyTurn(turn)) {
      pendingTools.push(turn);
      return;
    }
    flushTools();
    result.push(turn);
  });
  flushTools();
  return result.filter(hasDisplayableBody);
}

function buildDisplayTurns(turns: ConversationTurn[], chatMode: ChatMode): ConversationTurn[] {
  if (chatMode === "full") {
    return collapseToolRuns(turns.filter((turn) => shouldShowTurnInFull(turn) || isToolOnlyTurn(turn)));
  }
  return buildFocusedTurns(turns);
}

function turnBody(turn: ConversationTurn): string {
  if (turn.role === "user") {
    if (turn.selected) {
      const text = cleanTurnText(turn.display_text) || cleanTurnText(turn.summary_text) || cleanTurnText(turn.text_snippet);
      if (text) {
        return text;
      }
      return "[无文本]";
    }
    return cleanTurnText(turn.summary_text || turn.display_text || turn.text_snippet) || "[摘要]";
  }
  return (
    cleanTurnText(turn.display_text) ||
    cleanTurnText(turn.raw_text) ||
    cleanTurnText(turn.text_snippet) ||
    cleanTurnText(turn.summary_text) ||
    ""
  );
}

function truncateText(text: string, maxLines: number, maxChars: number): string {
  const lines = text.split("\n");
  if (lines.length > maxLines) {
    return `${lines.slice(0, maxLines).join("\n")}\n…`;
  }
  if (text.length > maxChars) {
    return `${text.slice(0, maxChars)}…`;
  }
  return text;
}

function isLongPrompt(text: string): boolean {
  return text.length > 480 || text.split("\n").length > 8;
}

function ChatBubble({ turn }: { turn: ConversationTurn }): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const isUser = turn.role === "user";
  const isCollapsedUser = isUser && !turn.selected && turn.quality_level === "low";
  const body = turnBody(turn);
  if (!cleanTurnText(body)) {
    return <></>;
  }
  const longUserPrompt = isUser && turn.selected && isLongPrompt(body);
  const visibleBody = longUserPrompt && !promptExpanded ? truncateText(body, 8, 480) : body;
  const canExpand =
    !isCollapsedUser &&
    Boolean(turn.raw_text && turn.raw_text.length > (turn.text_snippet?.length ?? 0) + 40);

  if (isCollapsedUser) {
    return (
      <details className={styles.summaryTurn}>
        <summary>
          <span className={styles.turnRole}>User</span>
          <span className={styles.summaryLabel}>[摘要]</span>
          <span className={styles.summaryHint}>{body}</span>
        </summary>
        <div className={styles.turnBody}>{body}</div>
      </details>
    );
  }

  if (isToolOnlyTurn(turn)) {
    return <></>;
  }

  return (
    <div
      className={isUser ? styles.userTurn : styles.assistantTurn}
      data-turn-role={turn.role}
      data-turn-order={turn.order}
    >
      <header className={styles.turnHeader}>
        <span className={styles.turnRole}>{isUser ? "You" : "Cursor"}</span>
        {isUser && turn.selected ? <span className={styles.turnBadge}>指导型 Prompt</span> : null}
        {!isUser && turn.tool_names && turn.tool_names.length > 0 ? (
          <span className={styles.turnTools}>{turn.tool_names.slice(0, 6).join(" · ")}</span>
        ) : null}
      </header>
      <div className={styles.turnBody}>
        <div className={styles.turnText}>{expanded && turn.raw_text ? turn.raw_text : visibleBody}</div>
        {longUserPrompt ? (
          <button
            type="button"
            className={styles.expandButton}
            onClick={() => setPromptExpanded((value) => !value)}
          >
            {promptExpanded ? "收起 Prompt" : `展开完整 Prompt（${body.length} 字）`}
          </button>
        ) : null}
        {canExpand ? (
          <button type="button" className={styles.expandButton} onClick={() => setExpanded((value) => !value)}>
            {expanded ? "收起" : "展开完整回复"}
          </button>
        ) : null}
      </div>
      {isUser && turn.file_paths && turn.file_paths.length > 0 ? (
        <footer className={styles.turnFooter}>
          {turn.file_paths.slice(0, 4).map((path) => (
            <span key={path} className={styles.fileTag}>
              {path.split("/").slice(-2).join("/")}
            </span>
          ))}
        </footer>
      ) : null}
    </div>
  );
}

function ExplorerTree({
  mode,
  entries,
  selectedKey,
  onSelect,
}: {
  mode: ViewMode;
  entries: SessionIndexEntry[];
  selectedKey: string | null;
  onSelect: (entry: SessionIndexEntry) => void;
}): React.JSX.Element {
  const groups = useMemo(() => {
    if (mode === "modules") {
      const map = new Map<string, SessionIndexEntry[]>();
      entries.forEach((entry) => {
        const tags = entry.module_tags.length > 0 ? entry.module_tags : ["未标记模块"];
        tags.forEach((tag) => {
          const bucket = map.get(tag) ?? [];
          bucket.push(entry);
          map.set(tag, bucket);
        });
      });
      return Array.from(map.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .map(([label, items]) => ({ label, items }));
    }

    if (mode === "stages") {
      const map = new Map<string, SessionIndexEntry[]>();
      entries.forEach((entry) => {
        const bucket = map.get(entry.top_stage) ?? [];
        bucket.push(entry);
        map.set(entry.top_stage, bucket);
      });
      return STAGE_ORDER.filter((stage) => map.has(stage)).map((stage) => ({
        label: stageLabel(stage),
        items: (map.get(stage) ?? []).sort((a, b) => a.modified_at.localeCompare(b.modified_at)),
      }));
    }

    const projectMap = new Map<string, Map<string, SessionIndexEntry[]>>();
    entries.forEach((entry) => {
      const dates = projectMap.get(entry.project) ?? new Map<string, SessionIndexEntry[]>();
      const bucket = dates.get(entry.date) ?? [];
      bucket.push(entry);
      dates.set(entry.date, bucket);
      projectMap.set(entry.project, dates);
    });

    return Array.from(projectMap.entries()).flatMap(([project, dates]) =>
      Array.from(dates.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, items]) => ({
          label: `${project} / ${date}`,
          items: [...items].sort((a, b) => a.modified_at.localeCompare(b.modified_at)),
        })),
    );
  }, [entries, mode]);

  return (
    <div className={styles.treeRoot}>
      {groups.map((group) => (
        <section key={group.label} className={styles.treeGroup}>
          <h3 className={styles.treeGroupTitle}>{group.label}</h3>
          <ul className={styles.treeList}>
            {group.items.map((entry) => {
              const key = sessionKey(entry);
              const active = key === selectedKey;
              return (
                <li key={key}>
                  <button
                    type="button"
                    className={active ? styles.treeItemActive : styles.treeItem}
                    onClick={() => onSelect(entry)}
                  >
                    <span className={styles.treeItemTop}>
                      <span className={styles.treeItemTime}>{entry.modified_at.slice(11, 16)}</span>
                      <span className={styles.treeItemStage}>{stageLabel(entry.top_stage)}</span>
                    </span>
                    <span className={styles.treeItemPreview}>{entry.prompt_preview}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default function AiCodingRecordDashboard(): React.JSX.Element {
  const bundleUrl = useBaseUrl("/ai-coding-record/web-record-bundle.json");
  const indexUrl = useBaseUrl("/ai-coding-record/session-index.json");
  const staticBase = useBaseUrl("/ai-coding-record/");

  const [summary, setSummary] = useState<RecordSummary | null>(null);
  const [sessionIndex, setSessionIndex] = useState<SessionIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("sessions");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState<SessionIndexEntry | null>(null);
  const [activeSession, setActiveSession] = useState<ConversationSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("focused");
  const [metaPanelOpen, setMetaPanelOpen] = useState(true);
  const [sessionCache] = useState(() => new Map<string, ConversationSession>());
  const chatPaneRef = useRef<HTMLDivElement | null>(null);

  const activeTurnStats = useMemo(() => {
    if (!activeSession) {
      return null;
    }
    const displayTurns = buildDisplayTurns(activeSession.turns, chatMode);
    const userTurns = displayTurns.filter((turn) => turn.role === "user").length;
    const assistantTurns = displayTurns.filter((turn) => turn.role === "assistant").length;
    const collapsedTurns = activeSession.turns.filter(
      (turn) => turn.role === "user" && !turn.selected && turn.quality_level === "low",
    ).length;
    const hiddenTurns = Math.max(activeSession.turns.length - displayTurns.length, 0);
    return { userTurns, assistantTurns, collapsedTurns, hiddenTurns, displayCount: displayTurns.length };
  }, [activeSession, chatMode]);

  const displayTurns = useMemo(() => {
    if (!activeSession) {
      return [];
    }
    return buildDisplayTurns(activeSession.turns, chatMode);
  }, [activeSession, chatMode]);

  const scrollToAssistantReplies = useCallback(() => {
    const pane = chatPaneRef.current;
    if (!pane) {
      return;
    }
    const firstAssistant = pane.querySelector('[data-turn-role="assistant"]');
    firstAssistant?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(bundleUrl).then((response) => {
        if (!response.ok) throw new Error(`bundle HTTP ${response.status}`);
        return response.json() as Promise<{ summary: RecordSummary }>;
      }),
      fetch(indexUrl).then((response) => {
        if (!response.ok) throw new Error(`index HTTP ${response.status}`);
        return response.json() as Promise<SessionIndex>;
      }),
    ])
      .then(([bundle, index]) => {
        if (!active) return;
        setSummary(bundle.summary);
        setSessionIndex(index);
        if (index.sessions.length > 0) {
          setSelectedEntry(index.sessions[0]);
        }
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [bundleUrl, indexUrl]);

  const filteredEntries = useMemo(() => {
    if (!sessionIndex) return [];
    return sessionIndex.sessions.filter((entry) => matchesFilters(entry, search, stageFilter, moduleFilter));
  }, [moduleFilter, search, sessionIndex, stageFilter]);

  const moduleOptions = useMemo(() => {
    if (!sessionIndex) return [];
    const tags = new Set<string>();
    sessionIndex.sessions.forEach((entry) => entry.module_tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [sessionIndex]);

  const loadSession = useCallback(
    async (entry: SessionIndexEntry) => {
      const key = sessionKey(entry);
      const cached = sessionCache.get(key);
      if (cached) {
        setActiveSession(cached);
        setSessionError(null);
        return;
      }

      setSessionLoading(true);
      setSessionError(null);
      try {
        const response = await fetch(`${staticBase}${entry.path}`);
        if (!response.ok) {
          throw new Error(`session HTTP ${response.status}`);
        }
        const payload = (await response.json()) as ConversationSession;
        sessionCache.set(key, payload);
        setActiveSession(payload);
      } catch (reason) {
        setActiveSession(null);
        setSessionError(reason instanceof Error ? reason.message : "加载失败");
      } finally {
        setSessionLoading(false);
      }
    },
    [sessionCache, staticBase],
  );

  useEffect(() => {
    if (!selectedEntry) return;
    setChatMode("focused");
  }, [selectedEntry?.project, selectedEntry?.session_id]);

  useEffect(() => {
    if (!selectedEntry) return;
    void loadSession(selectedEntry);
  }, [loadSession, selectedEntry]);

  useEffect(() => {
    if (!selectedEntry) return;
    if (filteredEntries.some((entry) => sessionKey(entry) === sessionKey(selectedEntry))) {
      return;
    }
    setSelectedEntry(filteredEntries[0] ?? null);
  }, [filteredEntries, selectedEntry]);

  if (error) {
    return <div className={styles.notice}>AI Coding Record 数据加载失败：{error}</div>;
  }

  if (!summary || !sessionIndex) {
    return <div className={styles.notice}>AI Coding Record 数据加载中…</div>;
  }

  return (
    <div className={`${styles.shell} ${metaPanelOpen ? "" : styles.shellMetaCollapsed}`}>
      <aside className={styles.activityBar} aria-label="视图切换">
        {(
          [
            ["sessions", "Sessions"],
            ["modules", "Modules"],
            ["stages", "Stages"],
            ["stats", "Stats"],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            className={viewMode === mode ? styles.activityButtonActive : styles.activityButton}
            onClick={() => setViewMode(mode)}
            title={label}
          >
            {label.slice(0, 1)}
          </button>
        ))}
      </aside>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <p className={styles.sidebarTitle}>EXPLORER</p>
          <p className={styles.sidebarSubtitle}>Narrative · {filteredEntries.length} sessions</p>
        </div>

        <div className={styles.sidebarFilters}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="搜索 session / prompt / 模块"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className={styles.filterRow}>
            <select className={styles.filterSelect} value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="all">全部阶段</option>
              {STAGE_ORDER.filter((stage) => stage !== "uncategorized").map((stage) => (
                <option key={stage} value={stage}>
                  {stageLabel(stage)}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value)}
            >
              <option value="all">全部模块</option>
              {moduleOptions.map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </div>
        </div>

        {viewMode === "stats" ? (
          <div className={styles.statsPanel}>
            <div className={styles.statsBlock}>
              <p className={styles.statsLabel}>总 Session</p>
              <p className={styles.statsValue}>{summary.session_count}</p>
            </div>
            <div className={styles.statsBlock}>
              <p className={styles.statsLabel}>Narrative Session</p>
              <p className={styles.statsValue}>{summary.narrative_session_count}</p>
            </div>
            <div className={styles.statsBlock}>
              <p className={styles.statsLabel}>指导型 Prompt</p>
              <p className={styles.statsValue}>{summary.selected_prompt_count}</p>
            </div>
            <div className={styles.statsList}>
              <p className={styles.statsLabel}>项目分布</p>
              {Object.entries(summary.projects).map(([project, count]) => (
                <div key={project} className={styles.statsRow}>
                  <span>{project}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
            <div className={styles.statsList}>
              <p className={styles.statsLabel}>阶段分布</p>
              {STAGE_ORDER.map((stage) => {
                const count = sessionIndex.sessions.filter((entry) => entry.top_stage === stage).length;
                if (count === 0) return null;
                return (
                  <button
                    key={stage}
                    type="button"
                    className={styles.statsRowButton}
                    onClick={() => {
                      setViewMode("stages");
                      setStageFilter(stage);
                    }}
                  >
                    <span>{stageLabel(stage)}</span>
                    <span>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <ExplorerTree
            mode={viewMode}
            entries={filteredEntries}
            selectedKey={selectedEntry ? sessionKey(selectedEntry) : null}
            onSelect={setSelectedEntry}
          />
        )}
      </aside>

      <main className={styles.main}>
        <header className={styles.mainHeader}>
          <div className={styles.mainHeaderCopy}>
            <p className={styles.mainEyebrow}>
              {selectedEntry ? `${selectedEntry.project} · ${selectedEntry.date}` : "未选择 Session"}
            </p>
            <h2 className={styles.mainTitle}>
              {selectedEntry ? selectedEntry.modified_at : "从左侧选择一个 Session"}
            </h2>
            {selectedEntry ? (
              <p className={styles.mainPreview}>{selectedEntry.prompt_preview}</p>
            ) : (
              <p className={styles.mainPreview}>对话区会按 Cursor 的 user / assistant 顺序展示真实过程。</p>
            )}
          </div>
          {selectedEntry ? (
            <div className={styles.mainTags}>
              <span>{stageLabel(selectedEntry.top_stage)}</span>
              <span>{selectedEntry.tracks.map(trackLabel).join(" / ") || "未归类"}</span>
              <span>{selectedEntry.selected_prompt_count} prompts</span>
            </div>
          ) : null}
        </header>

        {activeTurnStats && activeSession ? (
          <div className={styles.chatToolbar}>
            <span>
              {chatMode === "focused" ? "精选对话" : "完整过程"} · 显示 {activeTurnStats.displayCount} /{" "}
              {activeSession.turns.length} turns · {activeTurnStats.userTurns} 输入 · {activeTurnStats.assistantTurns}{" "}
              回复
              {chatMode === "focused" && activeTurnStats.hiddenTurns > 0
                ? ` · 已隐藏 ${activeTurnStats.hiddenTurns} 条过程噪声`
                : ""}
            </span>
            <div className={styles.chatToolbarActions}>
              <button
                type="button"
                className={styles.chatToolbarButton}
                onClick={() => setChatMode((mode) => (mode === "focused" ? "full" : "focused"))}
              >
                {chatMode === "focused" ? "查看完整过程" : "返回精选对话"}
              </button>
              <button type="button" className={styles.chatToolbarButton} onClick={scrollToAssistantReplies}>
                跳转到 Cursor 回复
              </button>
              <button
                type="button"
                className={styles.chatToolbarButton}
                onClick={() => setMetaPanelOpen((open) => !open)}
                aria-expanded={metaPanelOpen}
              >
                {metaPanelOpen ? "收起右侧栏" : "展开 Session 信息"}
              </button>
            </div>
          </div>
        ) : null}

        <div className={styles.chatPane} ref={chatPaneRef}>
          <div className={styles.chatPaneList}>
            {sessionLoading ? <div className={styles.chatPlaceholder}>Session 加载中…</div> : null}
            {sessionError ? <div className={styles.chatError}>Session 加载失败：{sessionError}</div> : null}
            {!sessionLoading && !sessionError && !activeSession ? (
              <div className={styles.chatPlaceholder}>请选择左侧 Session 查看对话。</div>
            ) : null}
            {!sessionLoading && !sessionError && activeSession && displayTurns.length === 0 ? (
              <div className={styles.chatPlaceholder}>当前 Session 没有可展示的精选对话，可切换到完整过程查看。</div>
            ) : null}
            {activeSession
              ? displayTurns.map((turn) => (
                  <ChatBubble key={`${activeSession.session_id}-${turn.order}`} turn={turn} />
                ))
              : null}
          </div>
        </div>
      </main>

      <aside className={`${styles.metaPanel} ${metaPanelOpen ? "" : styles.metaPanelCollapsed}`} aria-label="Session 元数据">
        <div className={styles.metaPanelHeader}>
          {metaPanelOpen ? <p className={styles.metaTitle}>Session</p> : null}
          <button
            type="button"
            className={styles.metaPanelToggle}
            onClick={() => setMetaPanelOpen((open) => !open)}
            aria-expanded={metaPanelOpen}
            aria-label={metaPanelOpen ? "收起右侧边栏" : "展开右侧边栏"}
            title={metaPanelOpen ? "收起" : "展开 Session 信息"}
          >
            {metaPanelOpen ? "›" : "‹"}
          </button>
        </div>
        {metaPanelOpen ? (
          activeSession ? (
            <>
              <dl className={styles.metaList}>
                <div>
                  <dt>ID</dt>
                  <dd>{activeSession.session_id}</dd>
                </div>
                <div>
                  <dt>阶段</dt>
                  <dd>{activeSession.stages.map(stageLabel).join(" / ") || stageLabel(activeSession.top_stage)}</dd>
                </div>
                <div>
                  <dt>业务线</dt>
                  <dd>{activeSession.tracks.map(trackLabel).join(" / ") || "未归类"}</dd>
                </div>
                <div>
                  <dt>模块</dt>
                  <dd>{activeSession.module_tags.slice(0, 6).join(" / ") || "未标记"}</dd>
                </div>
                <div>
                  <dt>工具</dt>
                  <dd>{activeSession.tool_usage.slice(0, 8).join(" / ") || "无记录"}</dd>
                </div>
                <div>
                  <dt>模型</dt>
                  <dd>{activeSession.models_used.join(" / ") || summary.models_observed.join(" / ") || "未记录"}</dd>
                </div>
              </dl>
              {activeSession.key_topics.length > 0 ? (
                <div className={styles.metaTopics}>
                  {activeSession.key_topics.map((topic) => (
                    <span key={topic} className={styles.metaTopic}>
                      {topic}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className={styles.metaEmpty}>选中 Session 后显示阶段、模块、工具和模型信息。</p>
          )
        ) : (
          <span className={styles.metaPanelRailLabel}>Session</span>
        )}
      </aside>

      <footer className={styles.statusBar}>
        <span>
          {summary.session_count} sessions · {summary.selected_prompt_count} prompts · narrative {sessionIndex.count}
        </span>
        <span>{Object.keys(summary.projects).join(" / ")}</span>
        <span>{sessionLoading ? "loading session…" : selectedEntry ? selectedEntry.session_id.slice(0, 8) : "idle"}</span>
      </footer>
    </div>
  );
}
