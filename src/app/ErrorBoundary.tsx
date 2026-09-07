import { Component, type ReactNode } from "react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="error-fallback">
        <h1>The workspace couldn’t load</h1>
        <p>
          Reload to restore your last valid URL. Your recent expressions stay in
          this browser.
        </p>
        <button onClick={() => location.reload()}>Reload workspace</button>
        <a href="/cronbuild-guide.md">Read the cron guide</a>
      </main>
    ) : (
      this.props.children
    );
  }
}
