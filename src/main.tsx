import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App'

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(e: Error): ErrorBoundaryState {
    return { error: e }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: 'var(--bg, #0A1628)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: 'monospace',
        }}>
          <div style={{
            background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: 16, padding: 24, maxWidth: 520, width: '100%',
          }}>
            <div style={{ color: 'var(--danger)', fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
               خطأ في التطبيق
            </div>
            <div style={{ color: 'var(--danger)', fontSize: 13, wordBreak: 'break-all', lineHeight: 1.7 }}>
              {String(this.state.error)}
            </div>
            {this.state.error?.stack && (
              <div style={{ color: 'rgba(248,113,113,0.6)', fontSize: 11, marginTop: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error.stack.slice(0, 600)}
              </div>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
