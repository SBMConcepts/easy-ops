/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

// ── Public types ─────────────────────────────────────────────────────────────

export interface LoginOptions {
  // matches public.tenants.auth0_org_id
  auth0OrgId?: string
  invitation?: string
}

export interface CredentialLoginOptions {
  email: string
  password: string
  // matches public.tenants.auth0_org_id
  auth0OrgId?: string
}

export interface Tenant {
  id: string // public.tenants.id (uuid)
  name: string // public.tenants.name
  logo_url?: string | null // public.tenants.logo_url
  status: string // public.tenants.status (tenant_status enum)
}

export interface User {
  id: string // matches public.users.id
  auth0_user_id: string
  email: string
  full_name: string
  avatar_url?: string | null
  tenant_id: string // public.tenants.id
  role: 'admin' | 'manager' | 'supervisor' | 'employee'
}

interface AuthContextType {
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (options?: LoginOptions) => Promise<void>
  loginWithCredentials: (options: CredentialLoginOptions) => Promise<void>
  logout: () => void
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
    user: auth0User,
  } = useAuth0()

  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [profileLoading, setProfileLoading] = useState<boolean>(false)

  // Fetch verified user profile context from Express API backend
  const syncProfileAndTenant = useCallback(async () => {
    if (!isAuthenticated || !auth0User) return

    setProfileLoading(true)
    try {
      const token = await getAccessTokenSilently()

      // Hit our newly optimized endpoint that infers tenant_id using the JWT's org_id claim
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const profileData = await response.json()

        // Populate local user states
        setUser({
          id: profileData.profile_id,
          auth0_user_id: auth0User.sub!,
          email: profileData.email,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          tenant_id: profileData.tenant_id,
          role: profileData.role,
        })

        // Populate local tenant states
        setTenant({
          id: profileData.tenant_id,
          name: profileData.tenant_name || 'Active Workspace',
          logo_url: profileData.tenant_logo,
          status: 'active',
        })
      }
    } catch (err) {
      console.error('Error syncing authentication profile context:', err)
    } finally {
      setProfileLoading(false)
    }
  }, [isAuthenticated, auth0User, getAccessTokenSilently])

  useEffect(() => {
    if (isAuthenticated) {
      void syncProfileAndTenant()
    } else {
      setUser(null)
      setTenant(null)
    }
  }, [isAuthenticated, syncProfileAndTenant])

  const getAccessToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently()
    } catch (err) {
      console.error('Failed to retrieve active access token:', err)
      return null
    }
  }, [getAccessTokenSilently])

  const login = useCallback(
    async (options?: LoginOptions) => {
      await loginWithRedirect({
        authorizationParams: {
          ...(options?.auth0OrgId ? { organization: options.auth0OrgId } : {}),
          ...(options?.invitation ? { invitation: options.invitation } : {}),
        },
      })
    },
    [loginWithRedirect]
  )

  const loginWithCredentials = useCallback(
    async (options: CredentialLoginOptions) => {
      await loginWithRedirect({
        authorizationParams: {
          login_hint: options.email,
          connection: 'Username-Password-Authentication',
          ...(options.auth0OrgId ? { organization: options.auth0OrgId } : {}),
        },
      })
    },
    [loginWithRedirect]
  )

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
    setUser(null)
    setTenant(null)
  }, [auth0Logout])

  const isLoading = auth0Loading || profileLoading

  return (
    <AuthContext.Provider
      value={
        {
          user,
          tenant,
          isAuthenticated,
          isLoading,
          login,
          loginWithCredentials,
          logout,
          getAccessToken,
        } as any
      }
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be executed inside an AuthProvider wrapper.')
  }
  return context
}
