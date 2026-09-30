import { Hammer } from "lucide-react";
import type { RouteObject } from "react-router";
import { EmptyState } from "@/components/ui";

const soon = (body: string) => <EmptyState icon={Hammer} title="Coming up" body={body} />;

const routes = [
  { path: "/documents", element: soon("Document register") },
  { path: "/documents/:docId", element: soon("Document detail") },
  { path: "/permits", element: soon("Permits & compliance") },
] satisfies RouteObject[];

export default routes;
