import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useAttendanceRecords, useSites } from '../hooks/useSupabaseData'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select'
import { useState } from 'react'
import { MapPin, Users, Clock } from 'lucide-react'

const statusColors: Record<string, string> = {
    present: 'bg-secondary/10 text-secondary border-secondary/20',
    late: 'bg-accent/10 text-accent-foreground border-accent/20',
    absent: 'bg-destructive/10 text-destructive border-destructive/20',
    on_leave: 'bg-muted text-muted-foreground border-muted',
}

const LiveAttendance = () => {
    const [siteFilter, setSiteFilter] = useState('all')
    const { data: reportData, isLoading: loadingRecords } =
        useAttendanceRecords()
    const { data: sites } = useSites()
    const records = reportData?.records || []

    const filtered =
        siteFilter === 'all'
            ? records
            : records.filter((r) => r.site_id === siteFilter)

    if (loadingRecords) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">
                        Live Attendance
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Real-time employee status across all sites
                    </p>
                </div>
                <Select
                    value={siteFilter}
                    onValueChange={(v) => setSiteFilter(v ?? 'all')}
                >
                    <SelectTrigger className="w-56">
                        <SelectValue placeholder="Filter by site" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sites</SelectItem>
                        {(sites || []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {(sites || []).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(sites || []).map((site) => {
                        const siteRecords = records.filter(
                            (r) => r.site_id === site.id
                        )
                        const present = siteRecords.filter(
                            (r) => r.status === 'present'
                        ).length
                        return (
                            <Card
                                key={site.id}
                                className="shadow-card cursor-pointer hover:shadow-card-hover transition-shadow"
                                onClick={() => setSiteFilter(site.id)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="h-4 w-4 text-secondary" />
                                        <span className="text-sm font-medium text-foreground">
                                            {site.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            {present}/{siteRecords.length}{' '}
                                            present
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            <Card className="shadow-card">
                <CardHeader>
                    <CardTitle className="font-display text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-secondary" />
                        {siteFilter === 'all'
                            ? 'All Employees'
                            : (sites || []).find((s) => s.id === siteFilter)
                                  ?.name || 'Site'}
                        <Badge variant="secondary" className="ml-2">
                            {filtered.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {filtered.map((rec) => (
                            <div
                                key={rec.id}
                                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                        {rec.profiles?.full_name || '—'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {rec.profiles?.department || '—'} ·{' '}
                                        {rec.sites?.name || '—'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        {rec.method}
                                    </Badge>
                                    {rec.clock_in && (
                                        <span className="text-xs font-mono text-foreground">
                                            {new Date(
                                                rec.clock_in
                                            ).toLocaleTimeString('en-ZA', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    )}
                                    <Badge
                                        variant="outline"
                                        className={
                                            statusColors[rec.status] || ''
                                        }
                                    >
                                        {rec.status}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No attendance records found.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default LiveAttendance
