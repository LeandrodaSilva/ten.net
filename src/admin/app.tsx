import { renderToString } from "react-dom/server";
import { Script } from "./components/script.tsx";
import Dashboard from "../layout/dashboard.tsx";
import { Plugins } from "./components/plugins.tsx";
import React from "react";

const App = ({ children }: {children: React.ReactElement}) => {
  return (
    <html className="h-full bg-gray-100">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">
        </script>
        <script
          src="https://cdn.jsdelivr.net/npm/@tailwindplus/elements@1"
          type="module"
        >
        </script>
      </head>
      <body className="h-full">
        <Dashboard>
          {children || <Plugins />}
        </Dashboard>
        <Script>
          {() => {
            // This function will also be converted to a string and injected into the HTML
            console.log("Hello from the Script component!!!!!");
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
