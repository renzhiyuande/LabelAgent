import type { DetailSectionSchema } from "@/low-code/schema/types";
import {
  ownerAppealAnnotateDetailSection,
  ownerAppealItemDetailSection,
} from "./owner-appeal-display.shared";
import { labelerSubmissionLifecycleSection } from "./labeler-submission-display.shared";

export const reviewerReviewRecordBasicSection: DetailSectionSchema = {
  key: "review",
  title: "审核记录",
  fields: [
    { key: "submissionCode", label: "提交单号", type: "text" },
    { key: "title", label: "标题", type: "text" },
    { key: "taskName", label: "任务", type: "text" },
    {
      key: "labelerName",
      label: "标注员",
      type: "user",
      user: { idField: "labelerId", nameField: "labelerName", role: "LABELER" },
    },
    { key: "reviewLevelDisplay", label: "审核级别", type: "text" },
    { key: "actionLabel", label: "审核动作", type: "text" },
    {
      key: "reviewerName",
      label: "审核员",
      type: "user",
      user: { idField: "reviewerId", nameField: "reviewerName", role: "REVIEWER" },
    },
    { key: "decidedAt", label: "审核时间", type: "datetime" },
    { key: "commentText", label: "审核意见", type: "text" },
  ],
};

export const reviewerReviewRecordDetailSections: DetailSectionSchema[] = [
  reviewerReviewRecordBasicSection,
  ownerAppealItemDetailSection,
  ownerAppealAnnotateDetailSection,
  labelerSubmissionLifecycleSection,
];
