import { Hammer } from "lucide-react";
import type { RouteObject } from "react-router";
import { EmptyState } from "@/components/ui";

const soon = (body: string) => <EmptyState icon={Hammer} title="Coming up" body={body} />;

const routes = [
  { path: "/maintenance", element: soon("PM schedule") },
  { path: "/maintenance/:planId", element: soon("PM plan") },
  { path: "/inspections", element: soon("Inspection log") },
  { path: "/inspections/new", element: soon("New inspection") },
  { path: "/inspections/:inspectionId", element: soon("Inspection") },
] satisfies RouteObject[];

export default routes;
