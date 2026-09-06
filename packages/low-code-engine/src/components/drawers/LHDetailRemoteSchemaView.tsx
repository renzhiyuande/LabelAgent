import { useEffect, useMemo, useRef, useState } from "react";
import { buildRemoteSchemaRequestKey, fetchRemoteSchema } from "../../adapters/request";
import type { DetailFieldSchema, FormSchema, OptionItem, ResourceMeta } from "../../schema/types";
import { formatFieldValue } from "../../utils/formatters";
import { getValueAtPath } from "../../utils/object-path";
import {
  flattenRemoteSchemaFields,
  remoteSchemaApiHasPathParams,
  buildDetailRemoteSchemaFetchValues,
  resolveDetailRemoteSchemaContext,
  resolveRemoteSchemaDisplayConfig,
  resolveRemoteSchemaModeLabel,
  resolveRemoteSchemaModeRowLabel,
} from "../../utils/detail-remote-schema";
import { normalizeRemoteSchema } from "../../utils/remote-schema";
import { resolveSchemaFieldDisplayLabel } from "../../utils/schema-field-display";
import { LHDetailOptionLoadHint } from "./LHDetailOptionLoadHint";

interface LHDetailRemoteSchemaViewProps {
  field: Pick<DetailFieldSchema, "key" | "path" | "label" | "remoteSchema">;
  displayRecord: Record<string, unknown>;
  resource?: ResourceMeta;
  dictOptions?: Record<string, OptionItem[]>;
  fieldOptions?: Record<string, OptionItem[]>;
  variant?: "grid" | "table";
}

export function LHDetailRemoteSchemaView({
  field,
  displayRecord,
  resource,
  dictOptions = {},
  fieldOptions = {},
  variant = "grid",
}: LHDetailRemoteSchemaViewProps) {
  const context = resolveDetailRemoteSchemaContext(resource, field, displayRecord);
  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);
  const remoteSchemaFetchKey = useMemo(() => {
    if (!context?.remoteSchema) {
      return null;
    }
    const fetchValues = buildDetailRemoteSchemaFetchValues(context);
    if (!remoteSchemaApiHasPathParams(context.remoteSchema.api)) {
      return buildRemoteSchemaRequestKey(context.remoteSchema, fetchValues);
    }
    if (!context.mode) {
      return null;
    }
    return buildRemoteSchemaRequestKey(context.remoteSchema, fetchValues);
  }, [context]);

  const [schemaState, setSchemaState] = useState<{
    schema: FormSchema;
    loading: boolean;
    error?: string;
  }>({ schema: { sections: [], actions: [] }, loading: false });

  useEffect(() => {
    const fetchContext = contextRef.current;
    if (!fetchContext?.remoteSchema || !remoteSchemaFetchKey) {
      setSchemaState({ schema: { sections: [], actions: [] }, loading: false });
      return;
    }
    let active = true;
    setSchemaState((current) => ({ ...current, loading: true, error: undefined }));

    void fetchRemoteSchema(fetchContext.remoteSchema, buildDetailRemoteSchemaFetchValues(fetchContext))
      .then((schema) => {
        if (!active) {
          return;
        }
        setSchemaState({
          schema: normalizeRemoteSchema(schema),
          loading: false,
        });
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const message = error instanceof Error && error.message.trim() ? error.message : "远程配置加载失败";
        console.warn(`[detail] failed to load remote schema for "${field.key}"`, {
          resource: resource?.resource,
          mode: fetchContext.mode,
          error,
        });
        setSchemaState({
          schema: { sections: [], actions: [] },
          loading: false,
          error: message,
        });
      });

    return () => {
      active = false;
    };
  }, [field.key, remoteSchemaFetchKey, resource?.resource]);

  const payloadKey = field.path ?? field.key;
  const rawPayload = getValueAtPath(displayRecord, payloadKey);

  if (!context) {
    const jsonValue = formatFieldValue({ type: "json" }, rawPayload);
    if (variant === "table") {
      return (
        <tr className="lh-detail-table-row" key={field.key}>
          <th scope="row" className="lh-detail-table-label">
            {field.label}
          </th>
          <td className="lh-detail-table-value">
            <pre className="lh-detail-table-json">{jsonValue}</pre>
          </td>
        </tr>
      );
    }
    return (
      <div className="lh-detail-item lh-detail-item--full">
        <span className="lh-field-label">{field.label}</span>
        <pre className="lh-detail-json-pre">{jsonValue}</pre>
      </div>
    );
  }

  const schemaFields = flattenRemoteSchemaFields(schemaState.schema);
  const displayConfig = useMemo(
    () => resolveRemoteSchemaDisplayConfig(schemaState.schema, context.config),
    [context.config, schemaState.schema],
  );
  const showModeRow = Boolean(context.modeField);
  const modeRowLabel = resolveRemoteSchemaModeRowLabel(field.label, context.modeField);
  const modeValue = resolveRemoteSchemaModeLabel(context.mode, context.modeField, fieldOptions);

  const rows = (
    <>
      {showModeRow ? (
        <div className="lh-detail-remote-schema-row lh-detail-remote-schema-row--mode">
          <span className="lh-field-label">{modeRowLabel}</span>
          <strong>{modeValue}</strong>
        </div>
      ) : null}
      {schemaState.loading ? (
        <p className="lh-detail-empty-hint">正在加载配置...</p>
      ) : null}
      <LHDetailOptionLoadHint message={schemaState.error} />
      {!schemaState.loading && !schemaState.error
        ? schemaFields.map((schemaField) => {
            const value = getValueAtPath(displayConfig, schemaField.path ?? schemaField.key);
            return (
              <div className="lh-detail-remote-schema-row" key={schemaField.key}>
                <span className="lh-field-label">{schemaField.label}</span>
                <strong>{resolveSchemaFieldDisplayLabel(schemaField, value, dictOptions)}</strong>
              </div>
            );
          })
        : null}
      {!schemaState.loading && !schemaState.error && schemaFields.length === 0 && (context.mode || !showModeRow) ? (
        <p className="lh-detail-empty-hint">当前类型未返回可展示字段</p>
      ) : null}
      {showModeRow && !context.mode ? <p className="lh-detail-empty-hint">未配置规则类型</p> : null}
    </>
  );

  if (variant === "table") {
    return (
      <>
        {showModeRow ? (
          <tr className="lh-detail-table-row" key={`${field.key}-mode`}>
            <th scope="row" className="lh-detail-table-label">
              {modeRowLabel}
            </th>
            <td className="lh-detail-table-value">
              <span className="lh-detail-table-text">{modeValue}</span>
              {schemaState.loading ? <p className="lh-detail-empty-hint">正在加载配置...</p> : null}
              <LHDetailOptionLoadHint message={schemaState.error} />
              {!context.mode ? <p className="lh-detail-empty-hint">未配置规则类型</p> : null}
            </td>
          </tr>
        ) : null}
        {!schemaState.loading && !schemaState.error
          ? schemaFields.map((schemaField) => {
              const value = getValueAtPath(displayConfig, schemaField.path ?? schemaField.key);
              return (
                <tr className="lh-detail-table-row" key={`${field.key}-${schemaField.key}`}>
                  <th scope="row" className="lh-detail-table-label">
                    {schemaField.label}
                  </th>
                  <td className="lh-detail-table-value">
                    <span className="lh-detail-table-text">
                      {resolveSchemaFieldDisplayLabel(schemaField, value, dictOptions)}
                    </span>
                  </td>
                </tr>
              );
            })
          : null}
        {!schemaState.loading && !schemaState.error && schemaFields.length === 0 && (context.mode || !showModeRow) ? (
          <tr className="lh-detail-table-row" key={`${field.key}-empty`}>
            <th scope="row" className="lh-detail-table-label">
              {field.label}
            </th>
            <td className="lh-detail-table-value">
              <p className="lh-detail-empty-hint">当前类型未返回可展示字段</p>
            </td>
          </tr>
        ) : null}
      </>
    );
  }

  return (
    <div className="lh-detail-item lh-detail-item--full lh-detail-remote-schema-block" key={field.key}>
      <span className="lh-field-label">{field.label}</span>
      <div className="lh-detail-remote-schema-grid">{rows}</div>
    </div>
  );
}
