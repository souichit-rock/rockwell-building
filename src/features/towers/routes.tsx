import { lazy } from "react";
import type { RouteObject } from "react-router";

const TowersPage = lazy(() => import("./pages/TowersPage"));
const TowerPage = lazy(() => import("./pages/TowerPage"));

const routes = [
  { path: "/towers", element: <TowersPage /> },
  { path: "/towers/:towerId", element: <TowerPage /> },
] satisfies RouteObject[];

export default routes;
