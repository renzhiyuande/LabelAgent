import { useCreate, useCustomMutation, useUpdate } from "@refinedev/core";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { resourceListRootKey } from "../adapters/query-keys";
import {
  applyOptimisticListPatch,
  resolveOptimisticRecordPatch,
  rollbackOptimisticListPatches,
} from "../adapters/optimistic-list-cache";
import { findSwitchColumn, resolveSwitchColumnValues } from "../components/data-table/LHTableSwitchCell";
import { resolveBulkResourceAction } from "../actions/bulk-action-registry";
import { runResourceAction } from "../adapters/request";
import type { ResourceMeta } from "../schema/types";
import type { EngineActionRequest, EngineBulkActionRequest, EngineListQuery, ResourceRecord } from "../types";
import type { ResourceListScope } from "../utils/list-scope";

function resolveBulkActionScope(
  request: EngineBulkActionRequest,
  listQuery?: EngineListQuery,
): ResourceListScope | undefined {
  if (request.scope) {
    return request.scope;
  }
  const taskFilter = listQuery?.filters?.find((item) => item.field === "taskId");
  if (taskFilter?.value != null && taskFilter.value !== "") {
    return { field: "taskId", value: taskFilter.value as string | number };
  }
  return undefined;
}
import { shouldRunLegacyResourceAction } from "../utils/resolve-legacy-action-api";

interface UseResourceMutationsOptions<TRecord extends ResourceRecord> {
  listQuery?: EngineListQuery;
  createRecord?: (values: Record<string, unknown>) => Promise<TRecord>;
  updateRecord?: (id: string | number, values: Record<string, unknown>) => Promise<TRecord>;
  runAction?: (request: EngineActionRequest) => Promise<Record<string, unknown> | void>;
  runBulkAction?: (request: EngineBulkActionRequest) => Promise<void>;
}

export function useResourceMutations<TRecord extends ResourceRecord>(
  resource: ResourceMeta,
  options: UseResourceMutationsOptions<TRecord> = {},
) {
  const { createRecord, updateRecord, runAction, runBulkAction, listQuery } = options;
  const usesRefineMutations = !createRecord && !updateRecord && !runAction && !runBulkAction;

  const queryClient = useQueryClient();
  const { mutateAsync: createMutate } = useCreate<TRecord>();
  const { mutateAsync: updateMutate } = useUpdate<TRecord>();
  const { mutateAsync: actionMutate } = useCustomMutation();

  const invalidateResourceList = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: resourceListRootKey(resource.resource) });
  }, [queryClient, resource.resource]);

  const create = useCallback(
    async (values: Record<string, unknown>) => {
      if (createRecord) {
        const result = await createRecord(values);
        await invalidateResourceList();
        return result;
      }
      const result = await createMutate({
        resource: resource.resource,
        values,
        meta: { resourceMeta: resource },
      });
      await invalidateResourceList();
      return result.data as TRecord;
    },
    [createMutate, createRecord, invalidateResourceList, resource],
  );

  const update = useCallback(
    async (id: string | number, values: Record<string, unknown>) => {
      if (updateRecord) {
        const result = await updateRecord(id, values);
        await invalidateResourceList();
        return result;
      }
      const result = await updateMutate({
        resource: resource.resource,
        id,
        values,
        meta: { resourceMeta: resource },
      });
      await invalidateResourceList();
      return result.data as TRecord;
    },
    [invalidateResourceList, resource, updateMutate, updateRecord],
  );

  const runResourceActionMutation = useCallback(
    async (request: EngineActionRequest): Promise<Record<string, unknown> | void> => {
      if (runAction) {
        return runAction(request);
      }

      if (shouldRunLegacyResourceAction(request.resource, request.action)) {
        const response = await runResourceAction(request);
        await invalidateResourceList();
        return response;
      }

      const recordId = request.record[resource.idKey] as string | number;
      const switchColumn = findSwitchColumn(resource);
      const switchValues = switchColumn ? resolveSwitchColumnValues(switchColumn) : null;
      const optimisticPatch = listQuery
        ? resolveOptimisticRecordPatch(request.action.key, listQuery, {
            field: switchColumn?.key,
            activeValue: switchValues?.checkedValue,
            inactiveValue: switchValues?.uncheckedValue,
          })
        : null;
      const snapshots = optimisticPatch
        ? applyOptimisticListPatch(queryClient, resource, recordId, optimisticPatch)
        : [];

      try {
        await actionMutate({
          url: "engine-action",
          method: "post",
          values: {},
          meta: {
            actionRequest: request,
            resourceMeta: resource,
          },
        });

        if (!optimisticPatch) {
          await invalidateResourceList();
        }
        return undefined;
      } catch (error) {
        if (snapshots.length > 0) {
          rollbackOptimisticListPatches(queryClient, snapshots);
        }
        throw error;
      }
    },
    [actionMutate, invalidateResourceList, listQuery, queryClient, resource, runAction],
  );

  const runBulkResourceActionMutation = useCallback(
    async (request: EngineBulkActionRequest) => {
      if (runBulkAction) {
        return runBulkAction(request);
      }
      const registeredHandler = resolveBulkResourceAction(
        request.resource.resource,
        request.action.key,
      );
      if (registeredHandler) {
        const scope = resolveBulkActionScope(request, listQuery);
        await registeredHandler(scope ? { ...request, scope } : request);
        await invalidateResourceList();
        return;
      }
      await actionMutate({
        url: "engine-bulk-action",
        method: "post",
        values: {},
        meta: {
          bulkActionRequest: request,
          resourceMeta: resource,
        },
      });
      await invalidateResourceList();
    },
    [actionMutate, invalidateResourceList, listQuery, resource, runBulkAction],
  );

  return useMemo(
    () => ({
      create,
      update,
      runAction: runResourceActionMutation,
      runBulkAction: runBulkResourceActionMutation,
      usesRefineMutations,
    }),
    [create, runBulkResourceActionMutation, runResourceActionMutation, update, usesRefineMutations],
  );
}
