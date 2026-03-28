import { renderToString } from "react-dom/server";
import { Script } from "./components/script.tsx";
import Dashboard from "../layout/dashboard.tsx";
import { Plugins } from "./components/plugins.tsx";
import type { ReactElement } from "react";

export const App = ({ children }: { children: ReactElement }) => {
  return (
    <html lang="en" className="h-full bg-gray-100">
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
        <Dashboard>
          {children || <Plugins />}
        </Dashboard>
        <Script>
          {() => {
            // @ts-ignore: DOM APIs available at runtime in browser
            const doc = globalThis.document;
            if (!doc) return;
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
