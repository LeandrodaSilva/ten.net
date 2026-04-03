import { renderToString } from "react-dom/server";
import { Script } from "./components/script.tsx";
import Dashboard from "./layout/dashboard.tsx";
import { BuilderLayout } from "./layout/builder-layout.tsx";
import { Plugins } from "./components/plugins.tsx";
import type { SidebarNavItem } from "./components/sidebar-nav.tsx";
import type { ReactElement } from "react";

export const App = (
  { children, navItems, userName }: {
    children: ReactElement;
    navItems?: SidebarNavItem[];
    userName?: string;
  },
) => {
  return (
    <html lang="en" className="h-full bg-white">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Admin — Ten.net</title>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">
        </script>
        <script
          src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1"
          type="module"
        >
        </script>
      </head>
      <body className="h-full">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to content
        </a>
        <Dashboard navItems={navItems} userName={userName}>
          {children || <Plugins />}
        </Dashboard>
        <Script>
          {() => {
            // @ts-ignore: DOM APIs available at runtime in browser
            const doc = globalThis.document;
            if (doc) {
              // @ts-ignore: Confirm delete
              doc.addEventListener("submit", (e) => {
                // @ts-ignore: DOM API
                const btn = e.target.querySelector("[data-confirm]");
                if (btn) {
                  // @ts-ignore: DOM API
                  const msg =
                    btn.getAttribute("data-confirm") || "Are you sure?";
                  // @ts-ignore: DOM API
                  if (!confirm(msg)) e.preventDefault();
                }
              });

              // @ts-ignore: Dismiss alerts
              doc.querySelectorAll("[data-dismiss-alert]").forEach(
                // @ts-ignore: DOM API
                (btn) => {
                  // @ts-ignore: DOM API
                  btn.addEventListener("click", () => {
                    // @ts-ignore: DOM API
                    const alert = btn.closest("[role='alert']");
                    // @ts-ignore: DOM API
                    if (alert) alert.remove();
                  });
                },
              );
            }
          }}
        </Script>
      </body>
    </html>
  );
};

export const appWithChildren = (Children: () => React.ReactElement) => {
  return `<!DOCTYPE html>${
    renderToString(
      <App>
        <Children />
      </App>,
    )
  }`;
};

export function renderAdminPage<P extends Record<string, unknown>>(
  Component: (props: P) => React.ReactElement,
  props: P,
  navItems?: SidebarNavItem[],
  userName?: string,
): string {
  return `<!DOCTYPE html>${
    renderToString(
      <App navItems={navItems} userName={userName}>
        <Component {...props} />
      </App>,
    )
  }`;
}

export function renderBuilderPage<
  P extends { pageId: string; pageTitle?: string },
>(
  Component: (props: P) => React.ReactElement,
  props: P,
): string {
  return `<!DOCTYPE html>${
    renderToString(
      <BuilderLayout pageId={props.pageId} pageTitle={props.pageTitle}>
        <Component {...props} />
      </BuilderLayout>,
    )
  }`;
}
