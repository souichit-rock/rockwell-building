import { lazy } from "react";
import type { RouteObject } from "react-router";

const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const PlanPage = lazy(() => import("./pages/PlanPage"));
const InspectionsPage = lazy(() => import("./pages/InspectionsPage"));
const NewInspectionPage = lazy(() => import("./pages/NewInspectionPage"));
const InspectionPage = lazy(() => import("./pages/InspectionPage"));

const routes = [
  { path: "/maintenance", element: <SchedulePage /> },
  { path: "/maintenance/:planId", element: <PlanPage /> },
  { path: "/inspections", element: <InspectionsPage /> },
  { path: "/inspections/new", element: <NewInspectionPage /> },
  { path: "/inspections/:inspectionId", element: <InspectionPage /> },
] satisfies RouteObject[];

export default routes;
