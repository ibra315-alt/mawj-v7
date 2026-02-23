import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', background: '#07051c',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 24, fontFamily: 'monospace',
        }}>
          <div style={{
            background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.4)',
            borderRadius: 16, padding: 24, maxWidth: 520, width: '100%',
          }}>
            <div style={{ color: '#ff4757', fontWeight: 800, fontSize: 16, marginBottom: 12 }}>
              🔴 خطأ في التطبيق
            </div>
            <div style={{ color: '#ff4757', fontSize: 13, wordBreak: 'break-all', lineHeight: 1.7 }}>
              {String(this.state.error)}
            </div>
            {this.state.error?.stack && (
              <div style={{ color: 'rgba(255,71,87,0.6)', fontSize: 11, marginTop: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)