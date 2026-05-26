import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Search, Users, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useTenantApi } from '../hooks/useTenantApi'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'supervisor' | 'employee'
  department: string | null
  site_name: string | null
}

export default function EmployeeManagement() {
  const { apiFetch } = useTenantApi() // Contextual RLS integration
  const [search, setSearch] = useState('')

  // Query workforce database through isolated query keys
  const { data: employees = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ['workspace-employees'],
    queryFn: () => apiFetch<TeamMember[]>('employees'), // Replaces client-side database table views
  })

  const filtered = employees.filter(
    (emp) =>
      emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Workforce Registry</h1>
          <p className="text-sm text-muted-foreground">
            Manage organizational structures and permissions
          </p>
        </div>
        <Button className="bg-primary text-primary-foreground self-start sm:self-auto">
          <Users className="h-4 w-4 mr-2" /> Add Team Member
        </Button>
      </div>

      <div className="flex items-center max-w-sm relative">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search identity or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Assigned Location</th>
                  <th className="p-4">System Role</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((emp) => (
                    <tr key={emp.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-medium text-foreground">{emp.full_name || '—'}</td>
                      <td className="p-4 text-muted-foreground">{emp.email}</td>
                      <td className="p-4 text-foreground">{emp.department || '—'}</td>
                      <td className="p-4 text-muted-foreground">{emp.site_name || '—'}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="capitalize text-xs font-medium">
                          {emp.role}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info('Profile adjustment utility coming soon')}
                        >
                          Configure
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No matching records matching criteria discovered.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
