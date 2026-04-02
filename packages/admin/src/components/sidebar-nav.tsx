import type { ReactElement } from "react";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: ReactElement;
  active?: boolean;
}

export interface SidebarNavProps {
  items: SidebarNavItem[];
  variant?: "light" | "dark";
}

export function SidebarNav({ items, variant = "light" }: SidebarNavProps) {
  const activeClass = variant === "dark"
    ? "bg-white/5 text-white"
    : "bg-gray-50 text-indigo-600";
  const defaultClass = variant === "dark"
    ? "text-gray-400 hover:bg-white/5 hover:text-white"
    : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600";

  return (
    <nav aria-label="Admin navigation">
      <ul role="list" className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`group flex items-center gap-x-3 rounded-md px-3 py-2 text-sm font-semibold ${
                item.active ? activeClass : defaultClass
              } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600`}
            >
              {item.icon}
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
