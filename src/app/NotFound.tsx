import { SearchX } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { paths } from "@/lib/paths";

/** `as`: the title is the page's h1; pass "h2" when it is shown inside a page that already has its own h1. */
export function NotFound({ what, id, as = "h1" }: { what?: string; id?: string; as?: "h1" | "h2" }) {
  const body = what && id ? `No ${what} matches "${id}".` : what ? `No such ${what}.` : "This page does not exist.";
  return (
    <EmptyState
      as={as}
      icon={SearchX}
      title="Not found"
      body={body}
      action={<Button to={paths.home()} variant="ghost" size="sm">Back to dashboard</Button>}
    />
  );
}

export default NotFound;
