import type { ReactElement } from "react";

export interface CardProps {
  title: string;
  description: string;
  href: string;
  icon: ReactElement;
  colorClass: string;
}

export function Card(
  { title, description, href, icon, colorClass }: CardProps,
) {
  return (
    <div className="group relative border-gray-200 bg-white p-6 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 sm:odd:not-nth-last-2:border-b sm:even:border-l sm:even:not-last:border-b">
      <div>
        <span className={`inline-flex rounded-lg p-3 ${colorClass}`}>
          {icon}
        </span>
      </div>
      <div className="mt-8">
        <h3 className="text-base font-semibold text-gray-900">
          <a href={href} className="focus:outline-hidden">
            <span aria-hidden="true" className="absolute inset-0"></span>
            {title}
          </a>
        </h3>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
          <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
        </svg>
      </span>
    </div>
  );
}
