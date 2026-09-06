# 文件 & 图片上传

> **相关文档**：[表单配置](./form) | [详情抽屉](./detail)

`UploadFieldMeta` 配置上传控件的行为与展示效果。支持单/多文件上传、图片预览、缩略图网格等能力。

## 完整配置

```typescript
interface UploadFieldMeta {
  multiple?: boolean;                   // 多选，默认 false
  maxCount?: number;                    // 最大数量，默认 9
  maxSizeMb?: number;                   // 单文件上限（MB），默认 5
  accept?: string;                      // input accept，默认 image/*
  displayMode?: "thumbnail" | "list" | "card";  // 展示方式
  previewOnClick?: boolean;             // 点击预览大图，默认 true
  showFileName?: boolean;               // 显示文件名，默认 true
  allowRename?: boolean;                // 允许重命名，默认 true
}
```

## 图片上传

```typescript
{
  key: "coverImage",
  label: "封面图",
  component: "imageUpload",
  upload: {
    multiple: false,         // 单图
    maxSizeMb: 5,            // 最大 5MB
    accept: "image/*",       // 仅图片
    displayMode: "thumbnail",// 缩略图展示
    previewOnClick: true,    // 点击预览
  },
}
```

多图模式：

```typescript
{
  key: "gallery",
  label: "相册",
  component: "imageUpload",
  upload: {
    multiple: true,
    maxCount: 9,
    displayMode: "card",     // 卡片网格展示
    showFileName: false,
    allowRename: false,
  },
}
```

## 文件上传

```typescript
{
  key: "attachment",
  label: "附件",
  component: "fileUpload",
  upload: {
    multiple: true,
    maxCount: 5,
    maxSizeMb: 20,           // 单文件 20MB
    accept: ".pdf,.doc,.docx,.xlsx",  // 限定文件类型
    displayMode: "list",     // 列表展示
    showFileName: true,
  },
}
```

## 展示模式

| `displayMode` | 效果 | 适用场景 |
|---|---|---|
| `thumbnail` | 缩略图网格 | 图片预览 |
| `list` | 文件列表（名称+大小+操作） | 文件附件 |
| `card` | 卡片式展示（大图+文件名） | 图片集、素材库 |

## 图片尺寸说明

- 上传后自动生成缩略图
- 详情页点击图片弹出大图预览（`previewOnClick: true`）
- 在详情页中使用 `type: "image"` 展示：

```typescript
detail: {
  sections: [{
    fields: [
      { key: "coverImage", label: "封面图", type: "image" },
    ],
  }],
}
```

## 上传流程

```
用户选择文件
    ↓
前端上传到文件素材服务
    ↓
返回文件 ID / URL
    ↓
表单值保存为 { fileId, name, mimeType, sizeBytes } 对象
    ↓
提交时由 prepareValues 提取所需字段
```

引擎内部使用素材库服务处理上传，详情查看 `frontend/src/features/assets/`。
