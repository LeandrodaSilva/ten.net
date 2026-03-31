import type { ReactElement } from "react";

export interface BuilderLayoutProps {
  children: ReactElement;
  pageId: string;
  pageTitle?: string;
}

export function BuilderLayout(
  { children, pageId: _pageId, pageTitle }: BuilderLayoutProps,
) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{pageTitle ? `${pageTitle} — Builder — Ten.net` : "Page Builder — Ten.net"}</title>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">
        </script>
        <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js">
        </script>
      </head>
      <body className="h-full bg-gray-50">
        {children}
      </body>
    </html>
  );
}
