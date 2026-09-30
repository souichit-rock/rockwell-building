import { lazy } from "react";
import type { RouteObject } from "react-router";

const StandardsList = lazy(() => import("./pages/StandardsList"));
const StandardDetail = lazy(() => import("./pages/StandardDetail"));
const Finishes = lazy(() => import("./pages/Finishes"));
const Compliance = lazy(() => import("./pages/Compliance"));

const routes = [
  { path: "/standards", element: <StandardsList /> },
  { path: "/standards/:standardId", element: <StandardDetail /> },
  { path: "/finishes", element: <Finishes /> },
  { path: "/compliance", element: <Compliance /> },
] satisfies RouteObject[];

export default routes;
