import { ReactNode } from 'react'
import './AppShell.css'

interface AppShellProps {
  sidebar: ReactNode
  mainContent: ReactNode
  floorplan: ReactNode
}

export const AppShell = ({ sidebar, mainContent, floorplan }: AppShellProps) => {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">{sidebar}</aside>
      <main className="app-main">
        <div className="panorama-section">{mainContent}</div>
        <div className="floorplan-section">{floorplan}</div>
      </main>
    </div>
  )
}
