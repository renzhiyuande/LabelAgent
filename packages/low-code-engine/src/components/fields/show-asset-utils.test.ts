import { describe, expect, it } from "vitest";
import {
  parseFileAssetRef,
  resolveShowImageDisplay,
  resolveShowImageDisplayList,
} from "./show-asset-utils";

describe("show-asset-utils", () => {
  it("parses file asset ref from object", () => {
    expect(parseFileAssetRef({ fileId: 12, name: "a.png", mimeType: "image/png" })).toEqual({
      fileId: 12,
      name: "a.png",
      mimeType: "image/png",
      sizeBytes: undefined,
    });
  });

  it("parses file asset ref using id and size aliases", () => {
    expect(
      parseFileAssetRef({
        id: "2062841467357507586",
        name: "77.csv",
        size: 2881,
        mimeType: "text/csv",
      }),
    ).toEqual({
      fileId: "2062841467357507586",
      name: "77.csv",
      mimeType: "text/csv",
      sizeBytes: 2881,
    });
  });

  it("resolves showImage asset source", () => {
    const field = {
      key: "hero",
      label: "题图",
      component: "showImage" as const,
      showImage: {
        contentSource: "asset" as const,
        asset: { fileId: 9, name: "cover.jpg" },
      },
    };
    expect(resolveShowImageDisplay(field, null)?.fileId).toBe(9);
  });

  it("resolves multiple assets for showImage", () => {
    const field = {
      key: "gallery",
      label: "图集",
      component: "showImage" as const,
      showImage: {
        contentSource: "asset" as const,
        multiple: true,
        assets: [
          { fileId: 1, name: "a.jpg" },
          { fileId: 2, name: "b.jpg" },
        ],
      },
    };
    expect(resolveShowImageDisplayList(field, null)).toHaveLength(2);
  });

  it("resolves payload array urls", () => {
    const field = {
      key: "photos",
      label: "照片",
      component: "showImage" as const,
      showImage: {
        contentSource: "payload" as const,
        multiple: true,
      },
    };
    const items = resolveShowImageDisplayList(field, [
      "https://example.com/a.jpg",
      { fileId: 3, name: "b.jpg" },
    ]);
    expect(items).toHaveLength(2);
    expect(items[0]?.directUrl).toBe("https://example.com/a.jpg");
    expect(items[1]?.fileId).toBe(3);
  });
});
