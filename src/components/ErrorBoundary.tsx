import { Component, type ReactNode } from 'react'

/** Shows a plain message instead of a blank page if a screen crashes. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto flex max-w-[520px] flex-col gap-3 px-4 py-10">
        <h1>Something went wrong</h1>
        <p className="sub">This screen hit a problem. Reload to try again.</p>
        <button className="btn" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
