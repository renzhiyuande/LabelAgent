import { useEffect, useState } from "react";
import {
  fetchAdminDashboardAnalytics,
  fetchAdminDashboardOverview,
  fetchLabelerDashboardAnalytics,
  fetchLabelerDashboardOverview,
  fetchOwnerDashboardOverview,
  fetchReviewerDashboardAnalytics,
  fetchReviewerDashboardOverview,
  type LabelerDashboardAnalytics,
  type OwnerDashboardAnalytics,
  type ReviewerDashboardAnalytics,
  type AdminDashboardAnalytics,
  fetchOwnerDashboardAnalytics,
} from "../dashboard-overview-api";
import type { DashboardOverviewState, WorkspaceKey } from "./dashboard-config";

interface DashboardDataState {
  overview: DashboardOverviewState;
  ownerAnalytics: OwnerDashboardAnalytics | null;
  labelerAnalytics: LabelerDashboardAnalytics | null;
  reviewerAnalytics: ReviewerDashboardAnalytics | null;
  adminAnalytics: AdminDashboardAnalytics | null;
  loading: boolean;
  errors: Partial<Record<WorkspaceKey, string>>;
}

interface DashboardOverviewOptions {
  includeOwnerAnalytics?: boolean;
  includeLabelerAnalytics?: boolean;
  includeReviewerAnalytics?: boolean;
  includeAdminAnalytics?: boolean;
}

export function useDashboardOverview(workspaceKeys: WorkspaceKey[], options: DashboardOverviewOptions = {}) {
  const workspaceSignature = [...workspaceKeys].sort().join("|");
  const optionSignature = JSON.stringify(options);
  const [state, setState] = useState<DashboardDataState>({
    overview: {
      owner: null,
      reviewer: null,
      labeler: null,
      admin: null,
    },
    ownerAnalytics: null,
    labelerAnalytics: null,
    reviewerAnalytics: null,
    adminAnalytics: null,
    loading: true,
    errors: {},
  });

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      const nextOverview: DashboardOverviewState = {
        owner: null,
        reviewer: null,
        labeler: null,
        admin: null,
      };
      let nextOwnerAnalytics: OwnerDashboardAnalytics | null = null;
      let nextLabelerAnalytics: LabelerDashboardAnalytics | null = null;
      let nextReviewerAnalytics: ReviewerDashboardAnalytics | null = null;
      let nextAdminAnalytics: AdminDashboardAnalytics | null = null;
      const nextErrors: Partial<Record<WorkspaceKey, string>> = {};
      const loaders: Promise<void>[] = [];

      setState((current) => ({ ...current, loading: true }));

      if (workspaceKeys.includes("owner")) {
        if (options.includeOwnerAnalytics) {
          loaders.push(
            Promise.all([fetchOwnerDashboardOverview(controller.signal), fetchOwnerDashboardAnalytics(controller.signal)])
              .then(([overview, analytics]) => {
                nextOverview.owner = overview;
                nextOwnerAnalytics = analytics;
              })
              .catch((error: unknown) => {
                nextErrors.owner = error instanceof Error ? error.message : "Owner 指标加载失败";
              }),
          );
        } else {
          loaders.push(
            fetchOwnerDashboardOverview(controller.signal)
              .then((data) => {
                nextOverview.owner = data;
              })
              .catch((error: unknown) => {
                nextErrors.owner = error instanceof Error ? error.message : "Owner 指标加载失败";
              }),
          );
        }
      }

      if (workspaceKeys.includes("reviewer")) {
        if (options.includeReviewerAnalytics) {
          loaders.push(
            Promise.all([fetchReviewerDashboardOverview(controller.signal), fetchReviewerDashboardAnalytics(controller.signal)])
              .then(([overview, analytics]) => {
                nextOverview.reviewer = overview;
                nextReviewerAnalytics = analytics;
              })
              .catch((error: unknown) => {
                nextErrors.reviewer = error instanceof Error ? error.message : "Reviewer 指标加载失败";
              }),
          );
        } else {
          loaders.push(
            fetchReviewerDashboardOverview(controller.signal)
              .then((data) => {
                nextOverview.reviewer = data;
              })
              .catch((error: unknown) => {
                nextErrors.reviewer = error instanceof Error ? error.message : "Reviewer 指标加载失败";
              }),
          );
        }
      }

      if (workspaceKeys.includes("labeler")) {
        if (options.includeLabelerAnalytics) {
          loaders.push(
            Promise.all([fetchLabelerDashboardOverview(controller.signal), fetchLabelerDashboardAnalytics(controller.signal)])
              .then(([overview, analytics]) => {
                nextOverview.labeler = overview;
                nextLabelerAnalytics = analytics;
              })
              .catch((error: unknown) => {
                nextErrors.labeler = error instanceof Error ? error.message : "Labeler 指标加载失败";
              }),
          );
        } else {
          loaders.push(
            fetchLabelerDashboardOverview(controller.signal)
              .then((data) => {
                nextOverview.labeler = data;
              })
              .catch((error: unknown) => {
                nextErrors.labeler = error instanceof Error ? error.message : "Labeler 指标加载失败";
              }),
          );
        }
      }

      if (workspaceKeys.includes("admin")) {
        if (options.includeAdminAnalytics) {
          loaders.push(
            Promise.all([fetchAdminDashboardOverview(controller.signal), fetchAdminDashboardAnalytics(controller.signal)])
              .then(([overview, analytics]) => {
                nextOverview.admin = overview;
                nextAdminAnalytics = analytics;
              })
              .catch((error: unknown) => {
                nextErrors.admin = error instanceof Error ? error.message : "Admin 指标加载失败";
              }),
          );
        } else {
          loaders.push(
            fetchAdminDashboardOverview(controller.signal)
              .then((data) => {
                nextOverview.admin = data;
              })
              .catch((error: unknown) => {
                nextErrors.admin = error instanceof Error ? error.message : "Admin 指标加载失败";
              }),
          );
        }
      }

      await Promise.all(loaders);
      if (cancelled) {
        return;
      }

      setState({
        overview: nextOverview,
        ownerAnalytics: nextOwnerAnalytics,
        labelerAnalytics: nextLabelerAnalytics,
        reviewerAnalytics: nextReviewerAnalytics,
        adminAnalytics: nextAdminAnalytics,
        loading: false,
        errors: nextErrors,
      });
    }

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 8000);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [workspaceSignature, optionSignature]);

  return state;
}
