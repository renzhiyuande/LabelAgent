export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T | null;
  traceId: string;
}

export interface PageResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  list: T[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export interface AuthenticatedUser {
  userId: number;
  username: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  roleNames: string[];
  dataScopeResources: string[];
}
