import { lazy } from "react";
import type { RouteObject } from "react-router";

const FloorPlanPage = lazy(() => import("./pages/FloorPlanPage"));
const SpacePage = lazy(() => import("./pages/SpacePage"));

const routes = [
  { path: "/towers/:towerId/floors/:floorId", element: <FloorPlanPage /> },
  { path: "/spaces/:spaceId", element: <SpacePage /> },
] satisfies RouteObject[];

export default routes;
