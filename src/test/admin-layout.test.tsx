import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStringIncludes } from "@std/assert";
import { renderToString } from "react-dom/server";
import { SidebarNav } from "../../packages/admin/src/components/sidebar-nav.tsx";
import Dashboard from "../../packages/admin/src/layout/dashboard.tsx";
import { HomeDashboard } from "../../packages/admin/src/components/home-dashboard.tsx";
import { App, renderAdminPage } from "../../packages/admin/src/app.tsx";
import type { SidebarNavItem } from "../../packages/admin/src/components/sidebar-nav.tsx";
import type { AuditLogEntry } from "../../packages/admin/src/components/logs.tsx";

// ─── Helpers ─────────────────────────────────────────────────────────
const navItems: SidebarNavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: <span>D</span>,
    active: true,
  },
  {
    label: "Posts",
    href: "/admin/plugins/post-plugin",
    icon: <span>P</span>,
    active: false,
  },
];

// ═══════════════════════════════════════════════════════════════════════
// 1. SidebarNav — variant dark / light
// ═══════════════════════════════════════════════════════════════════════
describe("SidebarNav — dark variant", () => {
  it("should apply dark active classes (bg-white/5 text-white)", () => {
    const html = renderToString(<SidebarNav items={navItems} variant="dark" />);
    // active item gets dark active class
    assertStringIncludes(html, "bg-white/5");
    assertStringIncludes(html, "text-white");
  });

  it("should apply dark inactive classes (text-gray-400)", () => {
    const html = renderToString(<SidebarNav items={navItems} variant="dark" />);
    assertStringIncludes(html, "text-gray-400");
  });

  it("should NOT apply light active classes when variant is dark", () => {
    const html = renderToString(<SidebarNav items={navItems} variant="dark" />);
    assertEquals(html.includes("bg-gray-50"), false);
    assertEquals(html.includes("text-indigo-600"), false);
  });
});

describe("SidebarNav — light variant (default)", () => {
  it("should apply light active classes when variant is light", () => {
    const html = renderToString(
      <SidebarNav items={navItems} variant="light" />,
    );
    assertStringIncludes(html, "bg-gray-50");
    assertStringIncludes(html, "text-indigo-600");
  });

  it("should default to light variant when no variant prop", () => {
    const html = renderToString(<SidebarNav items={navItems} />);
    assertStringIncludes(html, "bg-gray-50");
    assertStringIncludes(html, "text-indigo-600");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Dashboard layout — sidebar dark, profile dropdown, mobile dialog
// ═══════════════════════════════════════════════════════════════════════
describe("Dashboard layout", () => {
  it("should render dark sidebar with bg-gray-900", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "bg-gray-900");
  });

  it("should render fixed sidebar with w-72", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "lg:w-72");
  });

  it("should render main content area with lg:pl-72", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "lg:pl-72");
  });

  it("should render children in main area", () => {
    const html = renderToString(
      <Dashboard>
        <p>Hello Admin</p>
      </Dashboard>,
    );
    assertStringIncludes(html, "Hello Admin");
    assertStringIncludes(html, "main-content");
  });

  it("should render mobile sidebar dialog", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "sidebar");
    assertStringIncludes(html, "Fechar menu");
  });

  it("should render hamburger button for mobile", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Abrir menu");
  });

  it("should render notification bell", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Ver notificações");
  });

  it("should prepend Dashboard item to navItems", () => {
    const html = renderToString(
      <Dashboard navItems={navItems}>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Dashboard");
    assertStringIncludes(html, "Posts");
  });

  it("should render userName in profile area when provided", () => {
    const html = renderToString(
      <Dashboard userName="Leandro">
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Leandro");
  });

  it("should render initial letter from userName in avatar", () => {
    const html = renderToString(
      <Dashboard userName="Leandro">
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, ">L<");
  });

  it("should render default 'Admin' when no userName provided", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Admin");
  });

  it("should render default initial 'A' when no userName provided", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, ">A<");
  });

  it("should render profile dropdown with logout form", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, 'action="/admin/logout"');
    assertStringIncludes(html, 'method="POST"');
    assertStringIncludes(html, "Sair");
  });

  it("should render logout form in dropdown", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, 'action="/admin/logout"');
    assertStringIncludes(html, "Sair");
  });

  it("should render SidebarNav with dark variant in sidebar", () => {
    const html = renderToString(
      <Dashboard navItems={navItems}>
        <div>content</div>
      </Dashboard>,
    );
    // The SidebarContent uses variant="dark", so dark active classes should appear
    assertStringIncludes(html, "bg-white/5");
  });

  it("should render Ten.net brand text in sidebar", () => {
    const html = renderToString(
      <Dashboard>
        <div>content</div>
      </Dashboard>,
    );
    assertStringIncludes(html, "Ten.net");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. HomeDashboard — stats row, plugin cards, recent activity
// ═══════════════════════════════════════════════════════════════════════
describe("HomeDashboard — stats row", () => {
  it("should render all four stat labels", () => {
    const html = renderToString(
      <HomeDashboard stats={{ pages: 10, posts: 25, media: 100, users: 5 }} />,
    );
    assertStringIncludes(html, "Páginas");
    assertStringIncludes(html, "Posts");
    assertStringIncludes(html, "Mídias");
    assertStringIncludes(html, "Usuários");
  });

  it("should render stat values", () => {
    const html = renderToString(
      <HomeDashboard stats={{ pages: 10, posts: 25, media: 100, users: 5 }} />,
    );
    assertStringIncludes(html, "10");
    assertStringIncludes(html, "25");
    assertStringIncludes(html, "100");
  });

  it("should render stat links to plugin pages", () => {
    const html = renderToString(<HomeDashboard />);
    assertStringIncludes(html, 'href="/admin/plugins/page-plugin"');
    assertStringIncludes(html, 'href="/admin/plugins/post-plugin"');
    assertStringIncludes(html, 'href="/admin/plugins/media-plugin"');
    assertStringIncludes(html, 'href="/admin/plugins/user-plugin"');
  });

  it("should default stats to 0 when not provided", () => {
    const html = renderToString(<HomeDashboard />);
    // All four stat values should be "0"
    const zeroMatches = html.match(
      /text-3xl font-semibold tracking-tight text-gray-900[^>]*>0</g,
    );
    assertEquals(zeroMatches?.length, 4);
  });
});

describe("HomeDashboard — plugin cards", () => {
  it("should render plugins section heading", () => {
    const html = renderToString(<HomeDashboard />);
    assertStringIncludes(html, "Plugins");
  });

  it("should render plugin cards when provided", () => {
    const plugins = [
      { name: "Posts", slug: "post-plugin", description: "Manage blog posts" },
      { name: "Pages", slug: "page-plugin", description: "Manage pages" },
    ];
    const html = renderToString(<HomeDashboard plugins={plugins} />);
    assertStringIncludes(html, "Manage blog posts");
    assertStringIncludes(html, "Manage pages");
  });
});

describe("HomeDashboard — recent activity", () => {
  it("should render activity section heading", () => {
    const html = renderToString(<HomeDashboard />);
    assertStringIncludes(html, "Atividade recente");
  });

  it("should render 'Ver tudo' link to audit log", () => {
    const html = renderToString(<HomeDashboard />);
    assertStringIncludes(html, 'href="/admin/plugins/audit-log-plugin"');
    assertStringIncludes(html, "Ver tudo");
  });

  it("should render empty state when no activity", () => {
    const html = renderToString(<HomeDashboard recentActivity={[]} />);
    assertStringIncludes(html, "Nenhuma atividade registrada ainda.");
  });

  it("should render activity entries", () => {
    const entries: AuditLogEntry[] = [
      {
        action: "create",
        resource: "posts",
        resource_id: "p1",
        username: "admin",
        timestamp: new Date().toISOString(),
      },
      {
        action: "update",
        resource: "pages",
        resource_id: "pg1",
        username: "editor",
        timestamp: new Date().toISOString(),
      },
    ];
    const html = renderToString(<HomeDashboard recentActivity={entries} />);
    assertStringIncludes(html, "admin");
    assertStringIncludes(html, "create");
    assertStringIncludes(html, "posts");
    assertStringIncludes(html, "editor");
    assertStringIncludes(html, "update");
    assertStringIncludes(html, "pages");
  });

  it("should limit activity to 5 entries", () => {
    const entries: AuditLogEntry[] = Array.from({ length: 8 }, (_, i) => ({
      action: "create",
      resource: "posts",
      resource_id: `p${i}`,
      username: `user${i}`,
      timestamp: new Date().toISOString(),
    }));
    const html = renderToString(<HomeDashboard recentActivity={entries} />);
    // user5, user6, user7 should NOT appear (only first 5)
    assertStringIncludes(html, "user4");
    assertEquals(html.includes("user5"), false);
  });

  it("should render action-specific icons (create = emerald)", () => {
    const entries: AuditLogEntry[] = [{
      action: "create",
      resource: "posts",
      resource_id: "p1",
      username: "admin",
      timestamp: new Date().toISOString(),
    }];
    const html = renderToString(<HomeDashboard recentActivity={entries} />);
    assertStringIncludes(html, "text-emerald-500");
  });

  it("should render delete action icon (rose)", () => {
    const entries: AuditLogEntry[] = [{
      action: "delete",
      resource: "posts",
      resource_id: "p1",
      username: "admin",
      timestamp: new Date().toISOString(),
    }];
    const html = renderToString(<HomeDashboard recentActivity={entries} />);
    assertStringIncludes(html, "text-rose-500");
  });

  it("should render update action icon (amber)", () => {
    const entries: AuditLogEntry[] = [{
      action: "update",
      resource: "pages",
      resource_id: "pg1",
      username: "editor",
      timestamp: new Date().toISOString(),
    }];
    const html = renderToString(<HomeDashboard recentActivity={entries} />);
    assertStringIncludes(html, "text-amber-500");
  });

  it("should fallback to update icon for unknown actions", () => {
    const entries: AuditLogEntry[] = [{
      action: "unknown_action",
      resource: "posts",
      resource_id: "p1",
      username: "admin",
      timestamp: new Date().toISOString(),
    }];
    const html = renderToString(<HomeDashboard recentActivity={entries} />);
    assertStringIncludes(html, "text-amber-500");
  });

  it("should handle empty timestamp gracefully", () => {
    const entries: AuditLogEntry[] = [{
      action: "create",
      resource: "posts",
      resource_id: "p1",
      username: "admin",
      timestamp: "",
    }];
    const html = renderToString(<HomeDashboard recentActivity={entries} />);
    assertStringIncludes(html, "admin");
  });

  it("should handle invalid timestamp gracefully", () => {
    const entries: AuditLogEntry[] = [{
      action: "create",
      resource: "posts",
      resource_id: "p1",
      username: "admin",
      timestamp: "not-a-date",
    }];
    const html = renderToString(<HomeDashboard recentActivity={entries} />);
    assertStringIncludes(html, "not-a-date");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. App — userName prop propagation
// ═══════════════════════════════════════════════════════════════════════
describe("App — userName propagation", () => {
  it("should pass userName to Dashboard", () => {
    const html = renderToString(
      <App userName="Leandro">
        <p>Content</p>
      </App>,
    );
    assertStringIncludes(html, "Leandro");
  });

  it("should pass navItems to Dashboard", () => {
    const html = renderToString(
      <App navItems={navItems}>
        <p>Content</p>
      </App>,
    );
    assertStringIncludes(html, "Posts");
    assertStringIncludes(html, 'href="/admin/plugins/post-plugin"');
  });

  it("should render bg-white on html element", () => {
    const html = renderToString(
      <App>
        <p>Content</p>
      </App>,
    );
    assertStringIncludes(html, "bg-white");
  });

  it("should render skip-to-content link", () => {
    const html = renderToString(
      <App>
        <p>Content</p>
      </App>,
    );
    assertStringIncludes(html, 'href="#main-content"');
    assertStringIncludes(html, "Skip to content");
  });

  it("should render Tailwind CSS CDN script", () => {
    const html = renderToString(
      <App>
        <p>Content</p>
      </App>,
    );
    assertStringIncludes(html, "tailwindcss/browser@4");
  });

  it("should render Tailwind Plus elements script", () => {
    const html = renderToString(
      <App>
        <p>Content</p>
      </App>,
    );
    assertStringIncludes(html, "tailwindplus/elements@1");
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. renderAdminPage — navItems and userName wiring
// ═══════════════════════════════════════════════════════════════════════
describe("renderAdminPage — navItems and userName", () => {
  const SimpleComponent = ({ title }: { title: string }) => (
    <h1>{title}</h1>
  );

  it("should render component with props", () => {
    const html = renderAdminPage(SimpleComponent, { title: "My Page" });
    assertStringIncludes(html, "My Page");
  });

  it("should include DOCTYPE prefix", () => {
    const html = renderAdminPage(SimpleComponent, { title: "Test" });
    assertStringIncludes(html, "<!DOCTYPE html>");
  });

  it("should propagate navItems to sidebar", () => {
    const html = renderAdminPage(
      SimpleComponent,
      { title: "Test" },
      navItems,
    );
    assertStringIncludes(html, "Posts");
    assertStringIncludes(html, 'href="/admin/plugins/post-plugin"');
  });

  it("should propagate userName to profile area", () => {
    const html = renderAdminPage(
      SimpleComponent,
      { title: "Test" },
      navItems,
      "Leandro",
    );
    assertStringIncludes(html, "Leandro");
    assertStringIncludes(html, ">L<");
  });

  it("should render full layout with sidebar, main, and top bar", () => {
    const html = renderAdminPage(
      SimpleComponent,
      { title: "Full Layout" },
      navItems,
      "Admin",
    );
    assertStringIncludes(html, "bg-gray-900");
    assertStringIncludes(html, "lg:w-72");
    assertStringIncludes(html, "main-content");
    assertStringIncludes(html, "Full Layout");
  });
});
