import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import App from './App.tsx'
import './index.css'

export const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key: Add VITE_CLERK_PUBLISHABLE_KEY to your .env.local file')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{
        elements: {
          footer: { display: 'none' },
          footerAction: { display: 'none' },
          userButtonPopoverFooter: { display: 'none' },
        },
      }}
    >
      <App />
    </ClerkProvider>
  </React.StrictMode>,
)
