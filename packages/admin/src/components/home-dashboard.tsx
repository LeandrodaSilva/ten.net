import type { AuditLogEntry } from "./logs.tsx";
import { type PluginCardProps, Plugins } from "./plugins.tsx";

export interface HomeDashboardStats {
  pages: number;
  posts: number;
  media: number;
  users: number;
}

export interface HomeDashboardProps {
  stats?: HomeDashboardStats;
  plugins?: PluginCardProps[];
  recentActivity?: AuditLogEntry[];
}

const statItems = [
  {
    label: "Páginas",
    key: "pages" as const,
    href: "/admin/plugins/page-plugin",
  },
  { label: "Posts", key: "posts" as const, href: "/admin/plugins/post-plugin" },
  {
    label: "Mídias",
    key: "media" as const,
    href: "/admin/plugins/media-plugin",
  },
  {
    label: "Usuários",
    key: "users" as const,
    href: "/admin/plugins/user-plugin",
  },
];

const actionIcons: Record<string, { path: string; color: string }> = {
  create: {
    path: "M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    color: "text-emerald-500",
  },
  update: {
    path:
      "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10",
    color: "text-amber-500",
  },
  delete: {
    path:
      "m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0",
    color: "text-rose-500",
  },
};

function relativeTime(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return days < 30
    ? `${days}d atrás`
    : date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
}

export function HomeDashboard(
  { stats, plugins, recentActivity }: HomeDashboardProps,
) {
  const counts: HomeDashboardStats = {
    pages: stats?.pages ?? 0,
    posts: stats?.posts ?? 0,
    media: stats?.media ?? 0,
    users: stats?.users ?? 0,
  };

  const activity = (recentActivity ?? []).slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <dl className="grid grid-cols-1 gap-px bg-gray-900/5 rounded-xl overflow-hidden shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        {statItems.map((stat) => (
          <a
            key={stat.key}
            href={stat.href}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 bg-white px-4 py-8 sm:px-6 hover:bg-gray-50 transition-colors"
          >
            <dt className="text-sm font-medium text-gray-500">{stat.label}</dt>
            <dd className="w-full flex-none text-3xl font-semibold tracking-tight text-gray-900">
              {counts[stat.key].toLocaleString("pt-BR")}
            </dd>
          </a>
        ))}
      </dl>

      {/* Plugins grid */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Plugins</h2>
        <Plugins plugins={plugins} />
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">
            Atividade recente
          </h2>
          <a
            href="/admin/plugins/audit-log-plugin"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Ver tudo
          </a>
        </div>

        {activity.length === 0
          ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              Nenhuma atividade registrada ainda.
            </p>
          )
          : (
            <ul
              role="list"
              className="divide-y divide-gray-100 rounded-xl bg-white shadow-sm ring-1 ring-gray-900/5"
            >
              {activity.map((entry, i) => {
                const icon = actionIcons[entry.action] ?? actionIcons.update;
                return (
                  <li key={i} className="flex items-center gap-x-4 px-4 py-3">
                    <svg
                      aria-hidden="true"
                      className={`size-5 shrink-0 ${icon.color}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={icon.path}
                      />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900 truncate">
                        <span className="font-medium">{entry.username}</span>
                        {" "}
                        <span className="text-gray-500">{entry.action}</span>
                        {" "}
                        <span className="text-gray-700">{entry.resource}</span>
                      </p>
                    </div>
                    <span className="flex-none text-xs text-gray-400">
                      {relativeTime(entry.timestamp)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </div>
  );
}
