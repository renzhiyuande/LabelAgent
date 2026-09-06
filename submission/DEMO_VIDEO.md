# LabelHub Demo Video

## 成片状态（2026-06-10）

| 项 | 状态 |
| --- | --- |
| 最终成片 | **已制作**（约 **6 分 04 秒**，符合 5–10 分钟要求） |
| 封包附件 | **已拷贝**至 `submission/media/labelhub-demo-final.mp4` |
| 分段 / 截图 | `submission/media/segments/`（19 段）、`screenshots/`（32 张）、`chapter-cards/`（31 张） |
| 文档站镜像 | `project-docs/static/img/demo/` |
| 外部录制工程 | 可选；见下方「制作过程工程」 |

文档站说明：[project-docs/docs/contest/submission/demo-video.md](../project-docs/docs/contest/submission/demo-video.md)

## 覆盖范围（三角色完整链路）

### Owner（02–07）

- 工作台 → 任务管理 → 模板设计器（**打开设计器**）→ 提交记录 → AI 质检大屏 → 数据验收

### Labeler（08–12）

- 标注员工作台 → 我的任务 → 标注作业 → AI 辅助展示 → 已提交列表

### Reviewer（13–15）

- AI 审核队列 → **人工审核池（完整选任务流程）** → 审核结果

## 制作过程工程

录制流水线位于独立工程（本机可选路径，非仓库必需）：

```
labelhub-video/                   # 或外部 label_hub_video_record/labelhub-video/
├── docs/WORKFLOW.md
├── labelhub_video/page_map.py    # 17 段正片定义
├── scripts/pipeline.py           # record / build / all
└── output/final/labelhub-demo-final.mp4
```

```bash
cd labelhub-video && source .venv/bin/activate
python scripts/pipeline.py all
```

> `media/segments/` 含 17 段正片 + 2 个附加段（intro 等），以实际目录为准。

## 录制前提

- 前端：`http://127.0.0.1:5174`（交付栈，`pnpm delivery:stack:up`）
- 账号：`seed_owner` / `seed_labeler_ben` / `seed_reviewer_lin`，密码 `admin123`
- 详见 [DEMO_ENVIRONMENT.md](./DEMO_ENVIRONMENT.md)

## 封包核对清单

- [x] 拷贝 `labelhub-demo-final.mp4` 到 `submission/media/`
- [x] 拷贝分镜截图与章节卡片（见 [media/README.md](./media/README.md)）
- [ ] 确认视频内不出现已废弃的 `doubao` 样本口径（人工过片）
- [ ] 与 [SCREENSHOT_INDEX.md](./SCREENSHOT_INDEX.md) 页面名称一致（人工核对）
