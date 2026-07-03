import { NavLink, Outlet } from 'react-router-dom'
import { User, Activity, Shield } from 'lucide-react'
import '../styles/settings.css'

export default function SettingsLayout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
    }`

  return (
    <div className="settings-page ">
      <div className="settings-header">
        <h1 className="settings-header__title">Account Settings</h1>
        <p className="settings-header__subtitle">Manage your personal profile and preferences</p>
      </div>

      {/* Sub-navigation for Personal Settings */}
      <nav className="flex gap-4 border-b mb-6">
        <NavLink to="/app/settings/profile" className="settings-tabs__nav-trigger">
          <User className="h-4 w-4" /> Profile
        </NavLink>
        <NavLink to="/app/settings/attendance" className="settings-tabs__nav-trigger">
          <Activity className="h-4 w-4" /> Attendance Log
        </NavLink>
        <NavLink to="/app/settings/security" className="settings-tabs__nav-trigger">
          <Shield className="h-4 w-4" /> Security
        </NavLink>
      </nav>

      {/* Renders the active sub-route (Profile or Attendance) */}
      <div className="settings-tabs__content">
        <Outlet />
      </div>
    </div>
  )
}
