'use client'

import React from 'react'

export class ErrorBoundary extends React.Component<{ children: React.ReactNode, name: string }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error(`ErrorBoundary caught error in ${this.props.name}:`, error, errorInfo)
    
    // Auto-recover from chunk load errors, stale cache, or PWA issues
    const errorMsg = error?.message?.toLowerCase() || '';
    if (
      errorMsg.includes('failed to fetch dynamically imported module') ||
      errorMsg.includes('lazy-loaded component') ||
      errorMsg.includes('element type is invalid') ||
      errorMsg.includes('chunkLoadError')
    ) {
      const reloadKey = 'cache_bust_reload_attempted';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true');
        
        // Unregister service worker completely to flush bad cache
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let reg of registrations) {
              reg.unregister();
            }
            // Clear regular caches
            if (window.caches) {
              caches.keys().then((names) => {
                for (let name of names) {
                  caches.delete(name);
                }
              });
            }
            // Force reload from server
            window.location.reload();
          });
        } else {
          window.location.reload();
        }
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: 'red', color: 'white', direction: 'ltr' }}>
          <h2>Something went wrong in {this.props.name}</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{this.state.error?.message}</pre>
          <div style={{ marginTop: 20 }}>
            <p>If you see this error, please try clearing your browser cache or doing a Hard Refresh (Ctrl + F5).</p>
            <button 
              onClick={() => {
                sessionStorage.removeItem('cache_bust_reload_attempted');
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach(r => r.unregister()));
                }
                window.location.reload();
              }}
              style={{ background: 'white', color: 'red', padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}
            >
              Clear Cache & Reload
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
