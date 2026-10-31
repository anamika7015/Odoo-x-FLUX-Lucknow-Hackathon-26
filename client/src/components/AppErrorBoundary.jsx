import React from 'react';

export class AppErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Brightloop UI failed to render.', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="grid min-h-screen place-items-center bg-app-background px-6 text-app-text">
          <section className="max-w-md rounded-2xl border border-app-border bg-app-surface p-8 text-center shadow-lg">
            <p className="eyebrow">BRIGHTLOOP</p>
            <h1 className="mt-3 text-2xl font-semibold">This page could not load</h1>
            <p className="mt-2 text-sm text-app-muted">Reload the page to try again. If the problem continues, check the browser console.</p>
            <button className="primary-button mt-6" onClick={() => window.location.reload()}>Reload page</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
