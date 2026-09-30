import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router";
import { Button, Card } from "@/components/ui";
import { paths } from "@/lib/paths";

/**
 * What the person sees when a page throws: a render error, a stale lazy chunk after a deploy, or a seed chunk that failed to load.
 * Reload is the reliable way out (React.lazy keeps a rejected import, so a client-side retry would fail the same way).
 */
export function ErrorFallback({ error, fullPage = false }: { error?: Error; fullPage?: boolean }) {
  const card = (
    <Card title="Something went wrong" className="mx-auto max-w-lg">
      <div role="alert">
        <p className="type-body text-ink-soft">This page could not be shown. Reloading usually fixes it, for example after the site was updated.</p>
        {error?.message && <p className="mt-2 break-words font-mono text-xs text-muted">{error.message}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => window.location.reload()}>Reload</Button>
          <Button to={paths.home()} variant="ghost">Back to dashboard</Button>
        </div>
      </div>
    </Card>
  );
  return fullPage ? <div className="min-h-dvh p-4 pt-10">{card}</div> : card;
}

interface Props { children: ReactNode; resetKey?: string; fullPage?: boolean }
interface State { error?: Error }

class Boundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  // Navigating somewhere else gives the new page a fresh chance.
  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: undefined });
  }

  render() {
    return this.state.error ? <ErrorFallback error={this.state.error} fullPage={this.props.fullPage} /> : this.props.children;
  }
}

/** Catches anything its children throw. Must sit inside the router: it clears itself on every navigation (location key). */
export function ErrorBoundary({ children, fullPage }: { children: ReactNode; fullPage?: boolean }) {
  return <Boundary resetKey={useLocation().key} fullPage={fullPage}>{children}</Boundary>;
}

export default ErrorBoundary;
