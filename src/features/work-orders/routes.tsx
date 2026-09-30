import { Hammer } from "lucide-react";
import type { RouteObject } from "react-router";
import { EmptyState } from "@/components/ui";

const soon = (body: string) => <EmptyState icon={Hammer} title="Coming up" body={body} />;

const routes = [
  { path: "/work-orders", element: soon("Work orders") },
  { path: "/work-orders/new", element: soon("New work order") },
  { path: "/work-orders/:woId", element: soon("Work order") },
] satisfies RouteObject[];

export default routes;
