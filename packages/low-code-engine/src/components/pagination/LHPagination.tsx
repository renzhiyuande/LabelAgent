import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Input } from "../../components/ui/input";

interface LHPaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

type PageToken = number | "...";

function clampPage(page: number, totalPages: number): number {
  return Math.min(Math.max(1, page), totalPages);
}

function buildPageTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export function LHPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: LHPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [jumpValue, setJumpValue] = useState(String(page));
  const pageTokens = useMemo(() => buildPageTokens(page, totalPages), [page, totalPages]);
  const mobilePageTokens = useMemo(() => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    const start = clampPage(page - 1, totalPages);
    const end = clampPage(page + 1, totalPages);
    const values = new Set<number>([start, page, end]);
    return Array.from(values).sort((left, right) => left - right);
  }, [page, totalPages]);

  useEffect(() => {
    setJumpValue(String(page));
  }, [page]);

  function goToPage(nextPage: number) {
    onPageChange?.(clampPage(nextPage, totalPages));
  }

  function submitJump() {
    const parsed = Number(jumpValue);
    if (!Number.isFinite(parsed)) {
      setJumpValue(String(page));
      return;
    }
    const nextPage = clampPage(Math.trunc(parsed), totalPages);
    setJumpValue(String(nextPage));
    onPageChange?.(nextPage);
  }

  function handleJumpKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    submitJump();
  }

  return (
    <div className="lh-table-footer flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="lh-table-footer-summary flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span>第 {page} / {totalPages} 页</span>
        <span className="hidden sm:inline">共 {total} 条</span>
      </div>
      <div className="flex flex-row items-center justify-between gap-2 lg:flex-row lg:items-center lg:justify-end lg:gap-3">
        <div className="lh-table-footer-actions flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="hidden sm:inline-flex">
                {pageSize} 条 / 页
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {[10, 20, 50].map((size) => (
                <DropdownMenuItem key={size} onClick={() => onPageSizeChange?.(size)}>
                  {size} 条 / 页
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="outline" size="sm" className="hidden sm:inline-flex" disabled={page <= 1} onClick={() => goToPage(1)}>
            首页
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
            上一页
          </Button>
          <div className="hidden flex-wrap items-center gap-1 sm:flex">
            {pageTokens.map((token, index) =>
              token === "..." ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={token}
                  type="button"
                  variant={token === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => goToPage(token)}
                >
                  {token}
                </Button>
              ),
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:hidden">
            {mobilePageTokens.map((token) => (
              <Button
                key={token}
                type="button"
                variant={token === page ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(token)}
              >
                {token}
              </Button>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>
            下一页
          </Button>
          <Button type="button" variant="outline" size="sm" className="hidden sm:inline-flex" disabled={page >= totalPages} onClick={() => goToPage(totalPages)}>
            尾页
          </Button>
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:self-auto">
          <span className="hidden text-sm text-muted-foreground sm:inline">跳至</span>
          <Input
            className="h-9 w-16 text-center sm:w-20"
            inputMode="numeric"
            pattern="[0-9]*"
            value={jumpValue}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/[^\d]/g, "");
              setJumpValue(nextValue);
            }}
            onKeyDown={handleJumpKeyDown}
          />
          <span className="hidden text-sm text-muted-foreground sm:inline">页</span>
          <Button type="button" variant="outline" size="sm" onClick={submitJump}>
            跳转
          </Button>
        </div>
      </div>
    </div>
  );
}
