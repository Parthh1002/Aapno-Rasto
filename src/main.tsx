import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed silently
    });
  });
}

// Global Error Boundary to prevent black screens on uncaught errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0a', color: '#fff', fontFamily: 'sans-serif', padding: '2rem'
        }}>
          <h1 style={{ color: '#FF9933', fontSize: '2rem', marginBottom: '1rem' }}>
            ⚠️ Something went wrong
          </h1>
          <p style={{ color: '#aaa', marginBottom: '1rem', textAlign: 'center', maxWidth: '500px' }}>
            The app encountered an error. Please check the browser console for details.
          </p>
          <pre style={{
            background: '#1a1a1a', padding: '1rem', borderRadius: '8px',
            color: '#ff6b6b', fontSize: '0.8rem', maxWidth: '600px', overflowX: 'auto'
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1.5rem', padding: '0.75rem 2rem', background: '#FF9933',
              color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '1rem', fontWeight: 'bold'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

