import { Hammer } from "lucide-react";
import type { RouteObject } from "react-router";
import { EmptyState } from "@/components/ui";

const soon = (body: string) => <EmptyState icon={Hammer} title="Coming up" body={body} />;

const routes = [
  { path: "/standards", element: soon("Design standards") },
  { path: "/standards/:standardId", element: soon("Standard detail") },
  { path: "/finishes", element: soon("Finish schedule") },
  { path: "/compliance", element: soon("Compliance matrix") },
] satisfies RouteObject[];

export default routes;
