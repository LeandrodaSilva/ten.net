export type RouteInfo = {
  route: string;
  regex: RegExp;
  hasPage: boolean;
};

export interface DefaultContext<P> {
  params?: P;
}