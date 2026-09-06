"use client";

import { DictTagClassNameFieldControl } from "./controls/DictTagClassNameFieldControl";
import { DictTagPreviewFieldControl } from "./controls/DictTagPreviewFieldControl";
import { DictTagToneFieldControl } from "./controls/DictTagToneFieldControl";
import { CheckboxGroupFieldControl } from "./controls/CheckboxGroupFieldControl";
import { CodeEditorFieldControl } from "./controls/CodeEditorFieldControl";
import { DateRangeFieldControl } from "./controls/DateRangeFieldControl";
import { DateTimeFieldControl } from "./controls/DateTimeFieldControl";
import { DateTimeRangeFieldControl } from "./controls/DateTimeRangeFieldControl";
import { FileUploadFieldControl } from "./controls/FileUploadFieldControl";
import { ImageUploadFieldControl } from "./controls/ImageUploadFieldControl";
import { JsonEditorFieldControl } from "./controls/JsonEditorFieldControl";
import { LlmSuggestFieldControl } from "./controls/LlmSuggestFieldControl";
import { MultiSelectFieldControl } from "./controls/MultiSelectFieldControl";
import { NumberRangeFieldControl } from "./controls/NumberRangeFieldControl";
import { RadioGroupFieldControl } from "./controls/RadioGroupFieldControl";
import { RichTextFieldControl } from "./controls/RichTextFieldControl";
import { RemoteSelectFieldControl } from "./controls/RemoteSelectFieldControl";
import { RemoteTreeSelectFieldControl } from "./controls/RemoteTreeSelectFieldControl";
import { TreeMultiSelectFieldControl } from "./controls/TreeMultiSelectFieldControl";
import { SelectFieldControl } from "./controls/SelectFieldControl";
import { ShowItemFieldControl } from "./controls/ShowItemFieldControl";
import { ShowImageFieldControl } from "./controls/ShowImageFieldControl";
import { ShowFileFieldControl } from "./controls/ShowFileFieldControl";
import { ShowVideoFieldControl } from "./controls/ShowVideoFieldControl";
import { SwitchFieldControl } from "./controls/SwitchFieldControl";
import { TagsFieldControl } from "./controls/TagsFieldControl";
import { TextareaFieldControl } from "./controls/TextareaFieldControl";
import { TextFieldControl } from "./controls/TextFieldControl";
import { UserFieldControl } from "./controls/UserFieldControl";
import type { BaseFieldViewModel, SharedFieldHandlers } from "./types";

interface FieldControlRendererProps {
  model: BaseFieldViewModel;
  handlers: SharedFieldHandlers;
}

export function FieldControlRenderer({ model, handlers }: FieldControlRendererProps) {
  const options = model.options ?? [];
  const rangeValue: [unknown, unknown] = Array.isArray(model.value)
    ? [model.value[0] ?? "", model.value[1] ?? ""]
    : ["", ""];

  switch (model.component) {
    case "richText":
      return (
        <RichTextFieldControl
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          richText={model.richText}
          onChange={handlers.onChange}
        />
      );
    case "textarea":
    case "userMentionTextarea":
      return (
        <TextareaFieldControl
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          rows={model.uiVariant === "table" ? 2 : model.rows}
          className={
            model.uiVariant === "table"
              ? "lh-table-textarea"
              : model.uiVariant === "form"
                ? "lh-form-control--textarea"
                : undefined
          }
          mentionOptions={options}
          onMentionSearch={handlers.onSearchChange}
          onChange={handlers.onChange}
        />
      );
    case "select":
      return (
        <SelectFieldControl
          label={model.label}
          value={model.value}
          options={options}
          placeholder={model.placeholder}
          disabled={model.disabled}
          emptyLabel={model.uiVariant === "query" ? "全部" : "请选择"}
          onChange={handlers.onChange}
        />
      );
    case "remoteTreeSelect":
      return (
        <RemoteTreeSelectFieldControl
          label={model.label}
          value={model.value}
          options={model.treeOptions ?? []}
          placeholder={model.placeholder}
          disabled={model.disabled}
          searchValue={model.searchValue}
          searchPlaceholder={model.searchPlaceholder}
          onChange={handlers.onChange}
          onSearchChange={handlers.onSearchChange}
        />
      );
    case "treeMultiSelect":
      return (
        <TreeMultiSelectFieldControl
          label={model.label}
          value={model.value}
          options={model.treeOptions ?? []}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "user":
      return (
        <UserFieldControl
          label={model.label}
          value={model.value}
          options={options}
          user={model.user}
          displayNameFallback={model.userDisplayName}
          placeholder={model.placeholder}
          disabled={model.disabled}
          searchValue={model.searchValue}
          onChange={handlers.onChange}
          onSearchChange={handlers.onSearchChange}
        />
      );
    case "remoteSelect":
      return (
        <RemoteSelectFieldControl
          label={model.label}
          value={model.value}
          options={options}
          placeholder={model.placeholder}
          disabled={model.disabled}
          searchValue={model.searchValue}
          searchPlaceholder={model.searchPlaceholder}
          onChange={handlers.onChange}
          onSearchChange={handlers.onSearchChange}
        />
      );
    case "tags":
      return (
        <TagsFieldControl
          value={model.value}
          options={options}
          placeholder={model.placeholder}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "multiSelect":
      return (
        <MultiSelectFieldControl
          label={model.label}
          value={model.value}
          options={options}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "radioGroup":
      return (
        <RadioGroupFieldControl
          name={model.key}
          value={model.value}
          options={options}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "checkboxGroup":
      return (
        <CheckboxGroupFieldControl
          value={model.value}
          options={options}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "switch":
      return (
        <SwitchFieldControl
          value={model.value}
          disabled={model.disabled}
          compact={model.uiVariant === "table"}
          onChange={handlers.onChange}
        />
      );
    case "json":
    case "jsonEditor":
      return (
        <JsonEditorFieldControl
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          error={model.error}
          onChange={handlers.onChange}
        />
      );
    case "codeEditor":
      return (
        <CodeEditorFieldControl
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "dateRange":
      return (
        <DateRangeFieldControl
          label={model.label}
          value={rangeValue}
          placeholder={model.placeholder}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "dateTimeRange":
      return (
        <DateTimeRangeFieldControl
          label={model.label}
          value={rangeValue}
          placeholder={model.placeholder}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "datetime":
      return (
        <DateTimeFieldControl
          label={model.label}
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "numberRange":
      return (
        <NumberRangeFieldControl
          value={rangeValue}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "showItem":
      return (
        <ShowItemFieldControl
          field={{
            key: model.key,
            label: model.label,
            component: "showItem",
            formatter: model.formatter,
            displayType: model.displayType,
            showItem: model.showItem,
          }}
          value={model.value}
          formValues={model.formValues}
        />
      );
    case "showImage":
      return (
        <ShowImageFieldControl
          field={{
            key: model.key,
            label: model.label,
            component: "showImage",
            showImage: model.showImage,
          }}
          value={model.value}
        />
      );
    case "showFile":
      return (
        <ShowFileFieldControl
          field={{
            key: model.key,
            label: model.label,
            component: "showFile",
            showFile: model.showFile,
          }}
          value={model.value}
        />
      );
    case "showVideo":
      return (
        <ShowVideoFieldControl
          field={{
            key: model.key,
            label: model.label,
            component: "showVideo",
            showVideo: model.showVideo,
          }}
          value={model.value}
        />
      );
    case "llmSuggest":
      return (
        <LlmSuggestFieldControl
          fieldCode={model.fieldCode ?? model.key}
          label={model.label}
          value={model.value}
          description={model.description}
          disabled={model.disabled}
          llm={model.llm}
          templateVersionId={
            model.templateVersionId != null ? String(model.templateVersionId) : undefined
          }
          assignmentId={model.assignmentId != null ? String(model.assignmentId) : undefined}
          submissionId={model.submissionId != null ? String(model.submissionId) : undefined}
          taskId={model.taskId != null ? String(model.taskId) : undefined}
          taskItemId={model.taskItemId != null ? String(model.taskItemId) : undefined}
          invokeAllowed={model.llmSuggestInvokeAllowed !== false}
          onChange={handlers.onChange}
          onApplyFieldValues={handlers.onApplyFieldValues}
        />
      );
    case "fileUpload":
      if (model.disabled && model.value != null) {
        return (
          <ShowFileFieldControl
            field={{
              key: model.key,
              label: model.label,
              component: "showFile",
              showFile: model.showFile ?? { contentSource: "payload", showSize: true },
            }}
            value={model.value}
          />
        );
      }
      return (
        <FileUploadFieldControl
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          upload={model.upload}
          onChange={handlers.onChange}
        />
      );
    case "imageUpload":
      if (model.disabled && model.value != null) {
        const multiple = model.upload?.multiple === true;
        return (
          <ShowImageFieldControl
            field={{
              key: model.key,
              label: model.label,
              component: "showImage",
              showImage: model.showImage ?? {
                contentSource: "payload",
                multiple,
                showFileName: model.upload?.showFileName !== false,
              },
            }}
            value={model.value}
          />
        );
      }
      return (
        <ImageUploadFieldControl
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          upload={model.upload}
          onChange={handlers.onChange}
        />
      );
    case "dictTagTone":
      return (
        <DictTagToneFieldControl
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          onChange={handlers.onChange}
        />
      );
    case "dictTagClassName":
      return (
        <DictTagClassNameFieldControl
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          formValues={model.formValues}
          onChange={handlers.onChange}
        />
      );
    case "dictTagPreview":
      return <DictTagPreviewFieldControl formValues={model.formValues} />;
    case "text":
    default:
      return (
        <TextFieldControl
          value={model.value}
          placeholder={model.placeholder}
          disabled={model.disabled}
          inputType={model.inputType}
          onChange={handlers.onChange}
        />
      );
  }
}
