/** User roles for RBAC. Accepts custom role strings beyond built-in roles. */
export type Role = string;

/** A registered admin user. */
export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: Role;
  createdAt: number;
}

/** An active user session. */
export interface Session {
  id: string;
  userId: string;
  username: string;
  role: Role;
  csrfToken: string;
  createdAt: number;
  expiresAt: number;
}

/** Configuration for the auth system. */
export interface AuthConfig {
  sessionTTL: number;
  cookieName: string;
  secureCookie: boolean;
  pbkdf2Iterations: number;
}

export type Permission = "read" | "create" | "update" | "delete";
/** Resources for RBAC. Accepts dynamic plugin slugs beyond built-in resources. */
export type Resource = string;

/** RBAC permission map (fallback when KV has no custom permissions). */
export const ROLE_PERMISSIONS: Record<string, Record<string, Permission[]>> = {
  admin: {
    dashboard: ["read"],
    pages: ["read", "create", "update", "delete"],
    posts: ["read", "create", "update", "delete"],
    categories: ["read", "create", "update", "delete"],
    groups: ["read", "create", "update", "delete"],
    users: ["read", "create", "update", "delete"],
    settings: ["read", "update"],
    "role-plugin": ["read", "create", "update", "delete"],
    "audit-log-plugin": ["read"],
    widgets: ["read", "create", "update", "delete"],
    media: ["read", "create", "delete"],
  },
  editor: {
    dashboard: ["read"],
    pages: ["read", "create", "update", "delete"],
    posts: ["read", "create", "update", "delete"],
    categories: ["read", "create", "update", "delete"],
    groups: ["read", "create", "update", "delete"],
    users: [],
    settings: [],
    media: ["read", "create", "delete"],
  },
  viewer: {
    dashboard: ["read"],
    pages: ["read"],
    posts: ["read"],
    categories: ["read"],
    groups: ["read"],
    users: [],
    settings: [],
  },
};
