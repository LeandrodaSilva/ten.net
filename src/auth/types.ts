/** User roles for RBAC. */
export type Role = "admin" | "editor" | "viewer";

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
export type Resource =
  | "pages"
  | "posts"
  | "categories"
  | "groups"
  | "users"
  | "settings"
  | "dashboard";

/** RBAC permission map. */
export const ROLE_PERMISSIONS: Record<Role, Record<Resource, Permission[]>> = {
  admin: {
    dashboard: ["read"],
    pages: ["read", "create", "update", "delete"],
    posts: ["read", "create", "update", "delete"],
    categories: ["read", "create", "update", "delete"],
    groups: ["read", "create", "update", "delete"],
    users: ["read", "create", "update", "delete"],
    settings: ["read", "update"],
  },
  editor: {
    dashboard: ["read"],
    pages: ["read", "create", "update", "delete"],
    posts: ["read", "create", "update", "delete"],
    categories: ["read", "create", "update", "delete"],
    groups: ["read", "create", "update", "delete"],
    users: [],
    settings: [],
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
