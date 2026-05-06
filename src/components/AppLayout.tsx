'use client'
import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from './ui/sidebar'
import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'
import '../styles/appshell.css'

const AppLayout = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="app-main">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default AppLayout
