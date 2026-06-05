import { useState, useMemo } from 'react'
import { useTenantApi } from '../hooks/useTenantApi'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Database } from '../integrations/supabase/types'

type SiteRow = Database['public']['Tables']['sites']['Row']
type DepartmentRow = Database['public']['Tables']['departments']['Row']

export default function SitesAndDepartments() {
  const { apiFetch } = useTenantApi()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'sites' | 'departments'>('sites')
  const [siteSearch, setSiteSearch] = useState('')
  const [deptSearch, setDeptSearch] = useState('')

  const [siteDialogOpen, setSiteDialogOpen] = useState(false)
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)

  const [editingSite, setEditingSite] = useState<SiteRow | null>(null)
  const [editingDept, setEditingDept] = useState<DepartmentRow | null>(null)

  // Initialization functions for forms
  const defaultSiteForm = {
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    geofence_radius_m: '150',
  }
  const defaultDeptForm = { name: '', site_id: '' }

  const [siteForm, setSiteForm] = useState(defaultSiteForm)
  const [deptForm, setDeptForm] = useState(defaultDeptForm)

  const {
    data: sites = [],
    isLoading: loadingSites,
    refetch: refetchSites,
  } = useQuery({
    queryKey: ['sites'],
    queryFn: () => apiFetch<SiteRow[]>('sites'),
  })

  const {
    data: departments = [],
    isLoading: loadingDepts,
    refetch: refetchDepts,
  } = useQuery({
    queryKey: ['departments'],
    queryFn: () => apiFetch<DepartmentRow[]>('departments'),
  })

  // Mutations (unchanged for brevity but robust error handling remains)
  // ...

  // Optimized Filtering
  const filteredSites = useMemo(() => {
    return sites.filter((s) => s.name.toLowerCase().includes(siteSearch.toLowerCase()))
  }, [sites, siteSearch])

  const filteredDepts = useMemo(() => {
    return departments.filter((d) => d.name.toLowerCase().includes(deptSearch.toLowerCase()))
  }, [departments, deptSearch])

  const isLoading = activeTab === 'sites' ? loadingSites : loadingDepts

  // ... (Render methods remain structurally identical but utilize the memoized arrays)
}
