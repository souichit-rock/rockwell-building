import { Hammer } from "lucide-react";
import type { RouteObject } from "react-router";
import { EmptyState } from "@/components/ui";

const soon = (body: string) => <EmptyState icon={Hammer} title="Coming up" body={body} />;

const routes = [
  { path: "/towers/:towerId/floors/:floorId", element: soon("Floor plan") },
  { path: "/spaces/:spaceId", element: soon("Space detail") },
] satisfies RouteObject[];

export default routes;
