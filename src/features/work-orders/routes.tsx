import { lazy } from "react";
import type { RouteObject } from "react-router";

const WorkOrders = lazy(() => import("./pages/WorkOrders"));
const NewWorkOrder = lazy(() => import("./pages/NewWorkOrder"));
const WorkOrderDetail = lazy(() => import("./pages/WorkOrderDetail"));

const routes = [
  { path: "/work-orders", element: <WorkOrders /> },
  { path: "/work-orders/new", element: <NewWorkOrder /> },
  { path: "/work-orders/:woId", element: <WorkOrderDetail /> },
] satisfies RouteObject[];

export default routes;
