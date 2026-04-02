/// <reference path="../types/custom-elements.d.ts" />
import { SidebarNav, type SidebarNavItem } from "../components/sidebar-nav.tsx";
import type { ReactElement } from "react";

interface DashboardProps {
  children: ReactElement;
  navItems?: SidebarNavItem[];
  userName?: string;
}

const dashboardIcon = (
  <svg
    aria-hidden="true"
    className="size-6 shrink-0"
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

function SidebarContent(
  { navItems, userName }: { navItems: SidebarNavItem[]; userName?: string },
) {
  const initial = (userName ?? "A").charAt(0).toUpperCase();
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-gray-900 px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <span className="text-lg font-bold text-white tracking-tight">
          Ten.net
        </span>
      </div>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <SidebarNav items={navItems} variant="dark" />
          </li>
          <li className="mt-auto">
            <el-dropdown class="relative w-full">
              <button
                type="button"
                className="-mx-2 flex w-full items-center gap-x-4 rounded-md px-2 py-3 text-sm font-semibold text-gray-400 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                  {initial}
                </span>
                <span className="truncate">{userName ?? "Admin"}</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="ml-auto size-4 shrink-0 text-gray-500"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                  />
                </svg>
              </button>
              <el-menu
                anchor="top end"
                popover
                class="w-48 origin-bottom-left rounded-md bg-gray-800 py-2 shadow-lg outline outline-white/10 transition transition-discrete [--anchor-gap:--spacing(2)] data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <a
                  href="/admin/profile"
                  className="block px-3 py-1 text-sm text-gray-300 hover:bg-white/5 hover:text-white focus:bg-white/5 focus:outline-hidden"
                >
                  Seu perfil
                </a>
                <form method="POST" action="/admin/logout">
                  <button
                    type="submit"
                    className="block w-full px-3 py-1 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white focus:bg-white/5 focus:outline-hidden"
                  >
                    Sair
                  </button>
                </form>
              </el-menu>
            </el-dropdown>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default function Dashboard(
  { children, navItems, userName }: DashboardProps,
) {
  const allNavItems: SidebarNavItem[] = [
    { label: "Dashboard", href: "/admin", icon: dashboardIcon },
    ...(navItems ?? []),
  ];

  return (
    <div>
      {/* Mobile sidebar */}
      <el-dialog>
        <dialog id="sidebar" className="backdrop:bg-transparent lg:hidden">
          <el-dialog-backdrop className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0" />
          <div tabIndex={0} className="fixed inset-0 flex focus:outline-none">
            <el-dialog-panel className="group/dialog-panel relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full">
              {/* Close button */}
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out group-data-closed/dialog-panel:opacity-0">
                <button
                  type="button"
                  command="close"
                  commandfor="sidebar"
                  className="-m-2.5 p-2.5"
                >
                  <span className="sr-only">Fechar menu</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                    className="size-6 text-white"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18 18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <SidebarContent navItems={allNavItems} userName={userName} />
            </el-dialog-panel>
          </div>
        </dialog>
      </el-dialog>

      {/* Desktop fixed sidebar */}
      <div className="hidden bg-gray-900 ring-1 ring-white/10 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <SidebarContent navItems={allNavItems} userName={userName} />
      </div>

      {/* Main content area */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-xs sm:gap-x-6 sm:px-6 lg:px-8">
          {/* Hamburger — mobile only */}
          <button
            type="button"
            command="show-modal"
            commandfor="sidebar"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          >
            <span className="sr-only">Abrir menu</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>

          {/* Separator */}
          <div
            aria-hidden="true"
            className="h-6 w-px bg-gray-900/10 lg:hidden"
          />

          <div className="flex flex-1 justify-end gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Notification bell */}
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Ver notificações</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                </svg>
              </button>

              {/* Separator */}
              <div
                aria-hidden="true"
                className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10"
              />

              {/* Profile dropdown */}
              <el-dropdown class="relative">
                <button type="button" className="relative flex items-center">
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">Abrir menu do usuário</span>
                  <span className="flex size-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                    {(userName ?? "A").charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden lg:flex lg:items-center">
                    <span
                      aria-hidden="true"
                      className="ml-4 text-sm font-semibold text-gray-900"
                    >
                      {userName ?? "Admin"}
                    </span>
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      className="ml-2 size-5 text-gray-400"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      />
                    </svg>
                  </span>
                </button>
                <el-menu
                  anchor="bottom end"
                  popover
                  class="w-40 origin-top-right rounded-md bg-white py-2 shadow-lg outline outline-gray-900/5 transition transition-discrete [--anchor-gap:--spacing(2.5)] data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                >
                  <a
                    href="/admin/profile"
                    className="block px-3 py-1 text-sm text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:outline-hidden"
                  >
                    Seu perfil
                  </a>
                  <form method="POST" action="/admin/logout">
                    <button
                      type="submit"
                      className="block w-full px-3 py-1 text-left text-sm text-gray-900 hover:bg-gray-50 focus:bg-gray-50 focus:outline-hidden"
                    >
                      Sair
                    </button>
                  </form>
                </el-menu>
              </el-dropdown>
            </div>
          </div>
        </div>

        <main id="main-content" className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
