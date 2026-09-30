import { Hammer } from "lucide-react";
import type { RouteObject } from "react-router";
import { EmptyState } from "@/components/ui";

const soon = (body: string) => <EmptyState icon={Hammer} title="Coming up" body={body} />;

const routes = [
  { path: "/towers", element: soon("Towers") },
  { path: "/towers/:towerId", element: soon("Tower overview") },
] satisfies RouteObject[];

export default routes;
