import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ConfigErrorScreen from './components/ConfigErrorScreen.tsx'

const root = createRoot(document.getElementById('root')!)

// App is imported dynamically so that a FirebaseConfigError thrown while
// initialising Firebase (src/lib/firebase.ts) can be caught and shown as a
// helpful setup screen instead of a blank white page.
import('./App.tsx')
  .then(({ default: App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    console.error(error)
    root.render(
      <StrictMode>
        <ConfigErrorScreen error={error} />
      </StrictMode>,
    )
  })
