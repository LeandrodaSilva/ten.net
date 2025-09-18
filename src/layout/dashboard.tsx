import { Logs } from "../admin/components/logs.tsx";
import React from "react";

export default function Dashboard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col h-full">
      <header className="relative shrink-0 border-b border-white/10 bg-gray-900 before:pointer-events-none before:absolute before:inset-0 before:bg-black/10">
        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <img
            alt="Your Company"
            src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
            className="h-8 w-auto"
          />
          <div className="flex items-center gap-x-8">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-400 hover:text-white"
            >
              <span className="sr-only">View notifications</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                data-slot="icon"
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
            <a href="#" className="-m-1.5 p-1.5">
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
        {/*<aside className="sticky top-8 hidden w-44 shrink-0 lg:block h-full rounded-lg shadow-sm p-4 bg-white">*/}
        {/*</aside>*/}

        <main className="flex-1 h-full">
          {children}
        </main>

        <aside className="sticky top-8 hidden w-96 shrink-0 xl:block h-full rounded-lg shadow-sm p-4 bg-white">
          <Logs />
        </aside>
      </div>
    </div>
  );
}
