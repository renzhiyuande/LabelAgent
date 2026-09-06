# preference_compare 数据集

仓库内置偏好对比标注样本，供 `scripts/generate_preference_compare_seed.py` 与 health / universe seed 模块使用。

## 文件

| 文件 | 说明 |
|------|------|
| `preference_compare.json` | 36 条完整样本（可由 fixtures 导出，见下方） |
| `标注要求.md` | 标注说明，导入时写入模板静态说明 |

## 样本概览（36 条）

| `task_type` | 数量 | ID 范围 |
|-------------|------|---------|
| 知识问答 | 8 | P0001–P0004, P0013–P0016 |
| 代码生成 | 6 | P0005–P0006, P0017–P0020 |
| 安全合规 | 4 | P0007–P0008, P0021–P0022 |
| 多轮对话 | 4 | P0009–P0010, P0023–P0024 |
| 数学推理 | 4 | P0011–P0012, P0025–P0026 |
| 创意写作 | 4 | P0027–P0030 |
| 边界/平局 | 6 | P0031–P0036 |

**模型配对轮换**（catalog code）：

- `deepseek-v4-flash` + `deepseek-reasoner`：18 条（P0001–P0018）
- `deepseek-reasoner` + `deepseek-chat`：9 条（P0019–P0027）
- `deepseek-v4-flash` + `deepseek-chat`：9 条（P0028–P0036）

**主流程样本**：P0001–P0012 与 `FLOW_BY_SAMPLE` 对齐，覆盖已批准、退回、多级审核中、AI 驳回/通过、草稿、未领取等状态。

## 题面来源

权威题面库：`scripts/preference_compare_fixtures.py`

- `FIXTURE_BY_ID` — 36 条完整 dict
- `fixture_payload(id)` — 生成 `task_items.payload_json`
- `pick_fixtures(n, prefix=..., seed=...)` — health 任务确定性抽样
- `misalignment_scenario(fixture, kind)` — AI_STRICT / AI_LENIENT / APPEAL_OVERTURN 误判文案
- `export_dataset_list()` — 导出 JSON 列表

## 导出 JSON

```bash
python3 -c "
import json
from pathlib import Path
from scripts.preference_compare_fixtures import export_dataset_list
root = Path('testdata/preference_compare')
root.mkdir(parents=True, exist_ok=True)
(root / 'preference_compare.json').write_text(
    json.dumps(export_dataset_list(), ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8',
)
print('wrote', root / 'preference_compare.json')
"
```

（需在仓库根目录执行，或将 `scripts` 加入 `PYTHONPATH`。）

## 生成 seed SQL

```bash
python3 scripts/generate_all_seeds.py --only preference_compare
```

默认读取本目录下的 `preference_compare.json` 与 `标注要求.md`。

## 扩展指南

1. 在 `preference_compare_fixtures.py` 的 `_FIXTURES` 中增改样本，保持分布与 ID 校验通过。
2. 运行导出命令刷新 `preference_compare.json`。
3. 若主流程样本 ID 变化，同步更新 `generate_preference_compare_seed.py` 中的 `FLOW_BY_SAMPLE`。
