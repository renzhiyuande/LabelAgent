"""
动态提示词拼装服务模块
完全零硬编码字段实现，无需修改代码即可适配任意新增标注任务和任意数量审核维度
"""
from __future__ import annotations

import json

from app.services.score_calibration import resolve_dimension_anchor


class PromptService:
    """
    动态提示词拼装服务：完全零硬编码字段
    无需修改代码即可适配任意新增的标注任务类型和任意数量的审核维度
    """

    @staticmethod
    def _render_source_data(source_data: dict) -> str:
        item_sections = []
        for key, value in source_data.items():
            if isinstance(value, (dict, list)):
                rendered = json.dumps(value, ensure_ascii=False, indent=2)
            else:
                rendered = str(value)
            item_sections.append(f"{key}:\n{rendered}")
        return "\n\n".join(item_sections) if item_sections else "(无题面数据)"

    @staticmethod
    def _render_label_summary(label_data: dict) -> str:
        dynamic_label_sections = [
            f"  {field_name}: {field_value}" for field_name, field_value in label_data.items()
        ]
        return "\n".join(dynamic_label_sections) if dynamic_label_sections else "  (无额外标注字段)"

    def build_review_prompt(self, *, system_prompt: str, source_data: dict, label_data: dict, dimensions: list[str]) -> str:
        """
        自动组装大模型审核用的完整 User Prompt：
        1. 动态展示 item_payload 中所有题面字段（不限定 A/B 对比结构）
        2. 自动遍历标注员提交的所有动态字段，无需提前定义
        3. 按顺序枚举本次任务所有审核维度，要求 LLM 返回对应百分制分数
        """
        flattened_label_summary = self._render_label_summary(label_data)
        item_payload_text = self._render_source_data(source_data)

        dynamic_dimension_sections = []
        for idx, dim_name in enumerate(dimensions, 1):
            dynamic_dimension_sections.append(f"  {idx}. {dim_name}")
        dimension_list_text = "\n".join(dynamic_dimension_sections) if dynamic_dimension_sections else "  (暂无评分维度)"

        return (
            f"========== 原始题面 / 样本数据 ==========\n"
            f"{item_payload_text}\n\n"
            f"========== 标注员提交数据 ==========\n"
            f"动态标注载荷所有字段:\n{flattened_label_summary}\n\n"
            f"完整原始标注数据 (JSON):\n{json.dumps(label_data, ensure_ascii=False, indent=2)}\n\n"
            f"========== 动态评分维度要求 ==========\n"
            f"本次任务共 {len(dimensions)} 个评分维度，每个维度必须给出 0-100 的百分制整数分数:\n"
            f"{dimension_list_text}\n\n"
            "请严格遵守系统审核指令中定义的规则进行评分和判定。\n"
            "你必须输出以下 JSON 字段：\n"
            "1. scores：每个维度的整数分数\n"
            "2. dimensionReasons：每个维度的评分依据，说明“为何是这个分数”\n"
            "3. verdict：整体建议（pass/reject/manual）\n"
            "4. reason：整体摘要\n"
            f"返回 JSON 格式，scores 键名必须使用以下维度名称: {json.dumps(dimensions, ensure_ascii=False)}\n"
            "dimensionReasons 的键名必须与 scores 完全一致。\n"
            "结构为: { 'scores': { ... }, 'dimensionReasons': { ... }, 'verdict': 'pass|reject|manual', 'reason': '简要说明' }"
        )

    def build_review_prompt_from_specs(
        self,
        *,
        system_prompt: str,
        source_data: dict,
        label_data: dict,
        dimension_specs: list[dict],
    ) -> str:
        """按模板审查维度规格拼装 User Prompt，支持 promptInstruction 与分数范围。"""
        flattened_label_summary = self._render_label_summary(label_data)
        item_payload_text = self._render_source_data(source_data)

        dynamic_dimension_sections = []
        llm_names: list[str] = []
        for idx, spec in enumerate(dimension_specs, 1):
            dimension_key = str(spec.get("dimensionKey") or spec.get("dimension_key") or f"dim_{idx}")
            dimension_name = str(
                spec.get("dimensionName") or spec.get("dimension_name") or dimension_key
            ).strip()
            llm_names.append(dimension_name or dimension_key)
            instruction = spec.get("promptInstruction") or spec.get("prompt_instruction")
            score_min = spec.get("scoreMin", spec.get("score_min", 0))
            score_max = spec.get("scoreMax", spec.get("score_max", 100))
            line = f"  {idx}. {dimension_name} (key={dimension_key}, 分数范围 {score_min}-{score_max})"
            anchor, tolerance = resolve_dimension_anchor(spec)
            if anchor is not None and tolerance is not None:
                line += f"\n     稳定评分锚点: {int(anchor)}±{int(tolerance)}（同题重复调用须落在此区间）"
            if instruction:
                line += f"\n     说明: {instruction}"
            dynamic_dimension_sections.append(line)

        dimension_list_text = "\n".join(dynamic_dimension_sections) if dynamic_dimension_sections else "  (暂无评分维度)"

        return (
            f"========== 原始题面 / 样本数据 ==========\n"
            f"{item_payload_text}\n\n"
            f"========== 标注员提交数据 ==========\n"
            f"动态标注载荷所有字段:\n{flattened_label_summary}\n\n"
            f"完整原始标注数据 (JSON):\n{json.dumps(label_data, ensure_ascii=False, indent=2)}\n\n"
            f"========== 动态评分维度要求 ==========\n"
            f"本次任务共 {len(dimension_specs)} 个评分维度，每个维度必须给出对应范围内的整数分数:\n"
            f"{dimension_list_text}\n\n"
            "请严格遵守系统审核指令中定义的规则进行评分和判定。\n"
            "你必须输出以下 JSON 字段：\n"
            "1. scores：每个维度的整数分数\n"
            "2. dimensionReasons：每个维度的评分依据，说明“为何是这个分数”\n"
            "3. verdict：整体建议（pass/reject/manual）\n"
            "4. reason：整体摘要\n"
            f"返回 JSON 格式，scores 键名必须使用以下维度名称: {json.dumps(llm_names, ensure_ascii=False)}\n"
            "dimensionReasons 的键名必须与 scores 完全一致。\n"
            "结构为: { 'scores': { ... }, 'dimensionReasons': { ... }, 'verdict': 'pass|reject|manual', 'reason': '简要说明' }"
        )
