import type React from "react";

declare module "react" {
  // Invoker Commands API (not yet in @types/react@19)
  interface ButtonHTMLAttributes<T> {
    command?: string;
    commandfor?: string;
  }

  namespace JSX {
    interface IntrinsicElements {
      "el-dialog": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      "el-dialog-backdrop": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      "el-dialog-panel": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
      // el-dropdown uses `class` (web component attribute, not `className`)
      "el-dropdown": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & { class?: string },
        HTMLElement
      >;
      // el-menu uses `popover` as boolean and `anchor` as string.
      // Bypasses DetailedHTMLProps constraint to allow popover as boolean.
      "el-menu":
        & React.ClassAttributes<HTMLElement>
        & Omit<React.HTMLAttributes<HTMLElement>, "popover">
        & {
          class?: string;
          anchor?: string;
          popover?: boolean | string;
        };
    }
  }
}
