import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { AppWorkspace } from "../layout/AppWorkspace";
import { AuthGuard } from "../guards/AuthGuard";
import { PermissionGuard } from "../guards/PermissionGuard";
import { LoginPage } from "../../features/auth/LoginPage";
import { ForbiddenPage } from "../../features/error/ForbiddenPage";
import { getRegisteredSystemRoutePaths } from "../../lib/route-meta";

const systemRoutes = getRegisteredSystemRoutePaths();

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route element={<PermissionGuard />}>
            <Route path="/" element={<AppWorkspace />} />
            <Route path="/403" element={<ForbiddenPage />} />
            {systemRoutes.map((path) => (
              <Route key={path} path={path} element={<AppWorkspace />} />
            ))}
            <Route path="*" element={<AppWorkspace />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

/** @deprecated use AppRoutes wrapped by a single top-level BrowserRouter */
export function AppRouter() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRoutes />
    </BrowserRouter>
  );
}
