import type { ReactElement } from "react";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: ReactElement;
  active?: boolean;
}

export interface SidebarNavProps {
  items: SidebarNavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  return (
    <nav aria-label="Admin navigation">
      <ul role="list" className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`group flex items-center gap-x-3 rounded-md px-3 py-2 text-sm font-semibold ${
                item.active
                  ? "bg-gray-50 text-indigo-600"
                  : "text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
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
