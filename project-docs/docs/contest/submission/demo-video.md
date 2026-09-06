---
title: 演示视频
---

# 演示视频

> 封包正文：[`submission/DEMO_VIDEO.md`](../../../../submission/DEMO_VIDEO.md)

## 赛题要求

- 时长 **5–10 分钟**
- 覆盖 **Owner / Labeler / Reviewer** 三大角色完整链路

## 成片状态

| 项 | 状态 | 说明 |
| --- | --- | --- |
| 最终成片 | **已纳入封包** | `submission/media/labelhub-demo-final.mp4` |
| 时长 | **约 6 分 04 秒** | `labelhub-demo-final.mp4` ≈ 364s，符合 5–10 分钟要求 |
| 分段 / 截图 | 已拷贝 | `submission/media/segments/`、`screenshots/`；文档站 `static/img/demo/` |

## 成片与制作过程（外部工程）

制作过程与分镜定义位于独立工程（本机路径，供答辩备查）：

```
/Users/wangqiyan/Desktop/java/label_hub_video_record/labelhub-video/
├── docs/WORKFLOW.md              # 录制流程、Hermes 旧方案修正说明
├── labelhub_video/page_map.py    # 17 段页面/动作定义（唯一真相源）
├── configs/segments/*.json       # 各段 Playwright 配置
├── output/segments/*.mp4         # 分段录屏
└── output/final/
    └── labelhub-demo-final.mp4   # 最终合成成片
```

快速命令（摘自该工程 `README.md`）：

```bash
cd labelhub-video && source .venv/bin/activate
python scripts/verify.py
python scripts/gen_configs.py
python scripts/pipeline.py record    # 录制 15 段录屏
python scripts/pipeline.py build     # 合成最终视频
```

## 17 段分镜（覆盖三角色）

| 段 | 标题 | 角色 | 要点 |
| --- | --- | --- | --- |
| 01 | 开场 | — | 演示数据、三角色、Owner 登录 |
| 02–07 | Owner 链路 | owner | 工作台 → 任务 → 设计器 → 提交记录 → AI 质检 → 验收 |
| 08–12 | Labeler 链路 | labeler | 工作台 → 我的任务 → 标注作业 → AI 辅助 → 已提交 |
| 13–15 | Reviewer 链路 | reviewer | AI 队列 → **人工审核池（完整流程）** → 审核结果 |
| 16–17 | 章节卡片 / 结束 | — | 亮点总结 |

## 录制环境前提

- LabelHub 前端：`http://127.0.0.1:5174`（可通过 `LABELHUB_URL` 调整）
- 演示账号：`seed_owner` / `seed_labeler_ben` / `seed_reviewer_lin`，密码 `admin123`
- 详见 [`submission/DEMO_ENVIRONMENT.md`](../../../../submission/DEMO_ENVIRONMENT.md)

## 封包核对

- [x] 成片与素材已拷贝至 `submission/media/`（见 [`media/README.md`](../../../../submission/media/README.md)）
- [ ] 确认视频内无已废弃 `doubao` 口径（人工过片）
- [ ] 与 [`submission/SCREENSHOT_INDEX.md`](../../../../submission/SCREENSHOT_INDEX.md) 页面名称一致
