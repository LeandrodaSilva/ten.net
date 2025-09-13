import {findOrderedLayouts} from "./utils/findOrderedLayouts.ts";
import {findDocumentLayoutRoot} from "./utils/findDocumentLayoutRoot.ts";
import {Route} from "./models/Route.ts";

interface IViewEngine {
	_appPath: string;
	route: Route;
	req?: Request;
	params?: Record<string, string>;
}

export async function viewEngine(args: IViewEngine) {
	const {
		_appPath,
		route,
		req,
		params
	} = args;
	// let pageModule = Deno.readTextFileSync(
	// 	`${_appPath}${route.path}/page.html`,
	// );
	let pageModule = route.page;
	const layouts = findOrderedLayouts(_appPath, route.path);
	const documentLayout = findDocumentLayoutRoot(_appPath);
	pageModule = documentLayout.replace("{{content}}", pageModule);
	if (layouts) {
		for (let i = layouts.length - 1; i >= 0; i--) {
			const layoutContent = Deno.readTextFileSync(layouts[i]);
			pageModule = layoutContent.replace("{{content}}", pageModule);
		}

		if (route.call) {
			try {
				const routeResponse = await route.call(req, {
					params,
				}) as Response;

				if (routeResponse) {
					const body = await routeResponse.json();
					const keys = Object.keys(body);

					keys.forEach((key) => {
						pageModule = String(pageModule).replace(
							`{{${key}}}`,
							body[key],
						);
					});
				}
			} catch (e) {
				console.error(e);
			}
		}

		return pageModule;
	}
}