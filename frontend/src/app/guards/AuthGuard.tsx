import { useGetIdentity } from "@refinedev/core";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/auth";

function hasLocalAuthToken(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return Boolean(
    window.localStorage.getItem("labelhub.accessToken") ||
      window.localStorage.getItem("labelhub.refreshToken"),
  );
}

export function AuthGuard() {
  const location = useLocation();
  const hydrated = useAuthStore((state) => state.hydrated);
  const currentUser = useAuthStore((state) => state.currentUser);
  const hasTokenLocally = hasLocalAuthToken();
  const {
    isLoading: isLoadingIdentity,
    isFetching: isFetchingIdentity,
    isError: identityError,
    isFetched: identityFetched,
  } = useGetIdentity({
    queryOptions: { enabled: hasTokenLocally, retry: false },
  });

  if (!hasTokenLocally) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const restoringSession =
    !hydrated ||
    (isLoadingIdentity && !identityError) ||
    (!identityFetched && !identityError) ||
    (isFetchingIdentity && !currentUser && !identityError);

  if (restoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        正在恢复登录状态...
      </div>
    );
  }

  if (identityError || !currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
