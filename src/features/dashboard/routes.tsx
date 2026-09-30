import { lazy } from "react";
import type { RouteObject } from "react-router";

const Dashboard = lazy(() => import("./pages/Dashboard"));

const routes = [
  { path: "/", element: <Dashboard /> },
] satisfies RouteObject[];

export default routes;
