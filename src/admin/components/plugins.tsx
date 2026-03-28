export interface PluginCardProps {
  name: string;
  slug: string;
  description: string;
}

export interface PluginsProps {
  plugins?: PluginCardProps[];
}

const arrowIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-6">
    <path d="M20 4h1a1 1 0 00-1-1v1zm-1 12a1 1 0 102 0h-2zM8 3a1 1 0 000 2V3zM3.293 19.293a1 1 0 101.414 1.414l-1.414-1.414zM19 4v12h2V4h-2zm1-1H8v2h12V3zm-.707.293l-16 16 1.414 1.414 16-16-1.414-1.414z" />
  </svg>
);

const puzzleIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
    className="size-6"
  >
    <path
      d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .657-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const cardColors = [
  "bg-indigo-50 text-indigo-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
];

export const Plugins = ({ plugins }: PluginsProps) => {
  if (!plugins || plugins.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-gray-100">
          {puzzleIcon}
        </div>
        <h3 className="mt-4 text-sm font-semibold text-gray-900">
          No plugins registered
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Plugins will appear here once they are registered.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-gray-200 shadow-sm sm:grid sm:grid-cols-2 sm:divide-y-0">
      {plugins.map((plugin, index) => (
        <div
          key={plugin.slug}
          className={`group relative border-gray-200 bg-white p-6 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 ${
            index === 0 ? "rounded-tl-lg rounded-tr-lg sm:rounded-tr-none" : ""
          } sm:odd:not-nth-last-2:border-b sm:even:border-l sm:even:not-last:border-b`}
        >
          <div>
            <span
              className={`inline-flex rounded-lg p-3 ${
                cardColors[index % cardColors.length]
              }`}
            >
              {puzzleIcon}
            </span>
          </div>
          <div className="mt-8">
            <h3 className="text-base font-semibold text-gray-900">
              <a
                href={`/admin/plugins/${plugin.slug}`}
                className="focus:outline-hidden"
              >
                <span aria-hidden="true" className="absolute inset-0"></span>
                {plugin.name}
              </a>
            </h3>
            <p className="mt-2 text-sm text-gray-500">{plugin.description}</p>
          </div>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
          >
            {arrowIcon}
          </span>
        </div>
      ))}
    </div>
  );
};
