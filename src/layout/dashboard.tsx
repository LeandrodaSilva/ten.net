import { Logs } from "../admin/components/logs.tsx";
import {
  SidebarNav,
  type SidebarNavItem,
} from "../admin/components/sidebar-nav.tsx";
import type { ReactElement } from "react";

export default function Dashboard(
  { children, navItems }: {
    children: ReactElement;
    navItems?: SidebarNavItem[];
  },
) {
  const dashboardIcon = (
    <svg
      aria-hidden="true"
      className="size-5 shrink-0 text-gray-400 group-hover:text-indigo-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
      />
    </svg>
  );

  const allNavItems: SidebarNavItem[] = [
    { label: "Dashboard", href: "/admin", icon: dashboardIcon },
    ...(navItems ?? []),
  ];
  return (
    <div className="flex min-h-full flex-col h-full">
      <header className="relative shrink-0 border-b border-white/10 bg-gray-900 before:pointer-events-none before:absolute before:inset-0 before:bg-black/10">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <img
            alt="Ten.net"
            src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
            className="h-8 w-auto"
          />
          <div className="flex items-center gap-x-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-400 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <span className="sr-only">View notifications</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
                className="size-6"
              >
                <path
                  d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <a
              href="#"
              className="-m-1.5 p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded-full"
            >
              <span className="sr-only">Your profile</span>
              <img
                alt=""
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                className="size-8 rounded-full bg-gray-800 outline -outline-offset-1 outline-white/10"
              />
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl items-start gap-x-8 px-4 py-10 sm:px-6 lg:px-8 h-full">
        <aside
          aria-label="Site navigation"
          className="sticky top-8 hidden w-44 shrink-0 lg:block h-full rounded-lg shadow-sm p-4 bg-white"
        >
          <SidebarNav items={allNavItems} />
        </aside>

        <main id="main-content" className="flex-1 h-full">
          {children}
        </main>

        <aside
          aria-label="Activity log"
          className="sticky top-8 hidden w-96 shrink-0 xl:block h-full rounded-lg shadow-sm p-4 bg-white"
        >
          <Logs />
        </aside>
      </div>
    </div>
  );
}
