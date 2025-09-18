export function PluginList() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold text-gray-900">
            {"{{plugin}}"}
          </h1>
          <p className="mt-2 text-sm text-gray-700">{"{{description}}"}</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add user
          </button>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow-sm outline-1 outline-black/5 sm:rounded-lg">
              <table className="relative min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Title
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Email
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      Role
                    </th>
                    <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  <tr>
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                      Lindsay Walton
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Front-end Developer
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      lindsay.walton@example.com
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Member
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                      <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit<span className="sr-only">, Lindsay Walton</span>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                      Courtney Henry
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Designer
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      courtney.henry@example.com
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Admin
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                      <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit<span className="sr-only">, Courtney Henry</span>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                      Tom Cook
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Director of Product
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      tom.cook@example.com
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Member
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                      <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit<span className="sr-only">, Tom Cook</span>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                      Whitney Francis
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Copywriter
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      whitney.francis@example.com
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Admin
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                      <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit<span className="sr-only">, Whitney Francis</span>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                      Leonard Krasner
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Senior Designer
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      leonard.krasner@example.com
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Owner
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                      <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit<span className="sr-only">, Leonard Krasner</span>
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-gray-900 sm:pl-6">
                      Floyd Miles
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Principal Designer
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      floyd.miles@example.com
                    </td>
                    <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                      Member
                    </td>
                    <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
                      <a
                        href="#"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit<span className="sr-only">, Floyd Miles</span>
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
