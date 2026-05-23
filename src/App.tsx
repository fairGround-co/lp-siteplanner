import { useEffect } from 'react'
import { MapView } from './views/MapView'
import { usePlannerStore } from './store/usePlannerStore'
import './App.css'

function App() {
  const theme = usePlannerStore(s => s.config?.theme) || 'system'

  useEffect(() => {
    const applyTheme = (t: string) => {
      if (t === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      } else {
        document.documentElement.setAttribute('data-theme', t)
      }
    }
    
    applyTheme(theme)

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  return (
    <MapView />
  )
}

export default App
