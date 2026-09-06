import { describe, expect, it } from "vitest";
import {
  buildShowItemAssetToken,
  buildShowItemVideoToken,
  expandShowItemAssetTokens,
  highlightJsonHtml,
  interpolateShowItemTemplate,
  renderShowItemMarkdown,
  resolveShowItemAutoShellHeight,
  resolveShowItemHeightMode,
  resolveShowItemRawContent,
  sanitizeShowItemHtml,
  shouldUseShowItemPre,
} from "./show-item-utils";
import type { FormFieldSchema } from "../../schema/types";

describe("show-item-utils", () => {
  it("resolves auto shell height from content without forcing large min box", () => {
    expect(resolveShowItemAutoShellHeight(24)).toBe(40);
    expect(resolveShowItemAutoShellHeight(4)).toBe(32);
    expect(resolveShowItemAutoShellHeight(800)).toBe(480);
  });

  it("resolves show item height mode with legacy maxHeight fallback", () => {
    expect(
      resolveShowItemHeightMode({
        key: "a",
        label: "A",
        component: "showItem",
        showItem: { maxHeight: 400 },
      }),
    ).toBe("fixed");
    expect(
      resolveShowItemHeightMode({
        key: "b",
        label: "B",
        component: "showItem",
        showItem: { heightMode: "auto" },
      }),
    ).toBe("auto");
  });

  it("interpolates template placeholders from context", () => {
    expect(interpolateShowItemTemplate("题目：{{prompt}}", { prompt: "hello" })).toBe("题目：hello");
  });

  it("resolves static content", () => {
    const field: FormFieldSchema = {
      key: "hint",
      label: "提示",
      component: "showItem",
      showItem: { contentSource: "static", staticContent: "请先阅读题面" },
    };
    expect(resolveShowItemRawContent(field)).toBe("请先阅读题面");
  });

  it("resolves payload binding", () => {
    const field: FormFieldSchema = {
      key: "prompt",
      path: "prompt",
      label: "题目",
      component: "showItem",
      showItem: { contentSource: "payload" },
    };
    expect(
      resolveShowItemRawContent(field, {
        payload: { prompt: "abc" },
      }),
    ).toBe("abc");
  });

  it("strips script tags from html", () => {
    expect(sanitizeShowItemHtml('<p>ok</p><script>alert(1)</script>')).toBe("<p>ok</p>");
  });

  it("strips event handler attributes from html", () => {
    const html = sanitizeShowItemHtml('<img src="x" onerror="alert(1)" alt="x" />');
    expect(html).not.toMatch(/\bon\w+\s*=/i);
    expect(html).toContain('alt="x"');
  });

  it("strips dangerous tags like iframe and form", () => {
    expect(
      sanitizeShowItemHtml('<p>ok</p><iframe src="evil"></iframe><form action="x"></form>'),
    ).toBe("<p>ok</p>");
  });

  it("blocks javascript: in links", () => {
    const html = sanitizeShowItemHtml('<a href="javascript:alert(1)">link</a>');
    expect(html).not.toContain("javascript:");
  });

  it("renders gfm markdown tables", () => {
    const html = renderShowItemMarkdown(
      [
        "| 列1 | 列2 |",
        "| --- | --- |",
        "| a | b |",
        "| c | d |",
      ].join("\n"),
    );
    expect(html).toContain("<table");
    expect(html).toContain("<th>列1</th>");
    expect(html).toContain("<td>a</td>");
    expect(html).toContain("<td>d</td>");
  });

  it("renders markdown table followed by paragraph", () => {
    const html = renderShowItemMarkdown("| h |\n| - |\n| v |\n\n说明文字");
    expect(html).toContain("<table");
    expect(html).toContain("<p>说明文字</p>");
  });

  it("highlights json keys and string values", () => {
    const html = highlightJsonHtml('{\n  "name": "demo",\n  "count": 2,\n  "ok": true\n}');
    expect(html).toContain("text-sky-600");
    expect(html).toContain("text-emerald-600");
    expect(html).toContain("text-amber-600");
    expect(html).toContain("text-violet-600");
  });

  it("builds asset token for designer insert", () => {
    expect(buildShowItemAssetToken(12, "示意图")).toBe("{{asset:12|示意图}}");
  });

  it("expands asset tokens in markdown", () => {
    const md = expandShowItemAssetTokens("说明\n{{asset:9|图}}", "markdown");
    expect(md).toContain("![图](__LH_ASSET_9__)");
    const html = renderShowItemMarkdown(md);
    expect(html).toContain('data-lh-file-id="9"');
  });

  it("expands video tokens in markdown", () => {
    expect(buildShowItemVideoToken(8, "演示")).toBe("{{video:8|演示}}");
    const md = expandShowItemAssetTokens("{{video:8|演示}}", "markdown");
    expect(md).toContain("@[演示](__LH_VIDEO_ASSET_8__)");
    const html = renderShowItemMarkdown(md);
    expect(html).toContain('<video data-lh-file-id="8"');
    expect(html).toContain("controls");
  });

  it("renders markdown video syntax and html video blocks", () => {
    const inline = renderShowItemMarkdown("说明 @[演示](https://cdn.example.com/demo.mp4) 结束");
    expect(inline).toContain("<video");
    expect(inline).toContain('src="https://cdn.example.com/demo.mp4"');

    const block = renderShowItemMarkdown(
      '<video src="/api/v1/files/5/download" controls></video>',
    );
    expect(block).toContain('data-lh-file-id="5"');
  });

  it("renders image markdown with video file extension as video", () => {
    const html = renderShowItemMarkdown("![clip](https://cdn.example.com/clip.webm)");
    expect(html).toContain("<video");
    expect(html).not.toContain("<img");
  });

  it("expands asset tokens in html", () => {
    const html = expandShowItemAssetTokens("<p>{{asset:3}}</p>", "html");
    expect(html).toContain('data-lh-file-id="3"');
  });

  it("rewrites file api img src to authenticated placeholder", () => {
    const html = sanitizeShowItemHtml(
      '<img src="/api/v1/files/7/download" alt="x" />',
    );
    expect(html).toContain('data-lh-file-id="7"');
  });

  it("uses code block layout only when configured", () => {
    expect(
      shouldUseShowItemPre({
        key: "a",
        label: "a",
        component: "showItem",
        showItem: { layout: "inline", renderAs: "text" },
      }),
    ).toBe(false);
    expect(
      shouldUseShowItemPre({
        key: "b",
        label: "b",
        component: "showItem",
        showItem: { layout: "pre", renderAs: "text" },
      }),
    ).toBe(true);
  });
});
