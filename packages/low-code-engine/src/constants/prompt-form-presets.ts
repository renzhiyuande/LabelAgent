import type { PromptFormSchema } from "../schema/types";

export const LINK_URL_PROMPT: PromptFormSchema = {
  title: "插入链接",
  confirmLabel: "确定",
  initialValues: { url: "https://" },
  fields: [
    {
      key: "url",
      label: "链接地址",
      component: "text",
      required: true,
      placeholder: "https://",
      rules: [{ type: "pattern", value: "^https?://\\S+", message: "请输入有效 URL" }],
    },
  ],
};
