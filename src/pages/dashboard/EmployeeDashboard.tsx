import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { useAuth } from '../../contexts/AuthContext'
import { useMyAttendance } from '../../hooks/useSupabaseData'
import { QrCode, Clock, CalendarDays, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const EmployeeDashboard = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const { data: records, isLoading } = useMyAttendance()

    const myRecords = records || []
    const totalHours = myRecords.reduce(
        (sum, r) => sum + (r.hours_worked || 0),
        0
    )
    const totalOvertime = myRecords.reduce(
        (sum, r) => sum + (r.overtime || 0),
        0
    )
    const absentDays = myRecords.filter((r) => r.status === 'absent').length

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">
                        Welcome, {user?.name?.split(' ')[0] || 'Employee'}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Your attendance summary
                    </p>
                </div>
                <Button
                    onClick={() => navigate('/app/check-in')}
                    size="lg"
                    className="bg-secondary hover:bg-secondary/90"
                >
                    <QrCode className="h-5 w-5 mr-2" />
                    Clock In / Out
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <Card className="shadow-card">
                    <CardContent className="p-4 flex items-center gap-3">
                        <Clock className="h-8 w-8 text-secondary" />
                        <div>
                            <p className="text-2xl font-bold font-display">
                                {totalHours.toFixed(1)}h
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Hours Worked
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="p-4 flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-accent" />
                        <div>
                            <p className="text-2xl font-bold font-display">
                                {totalOvertime.toFixed(1)}h
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Overtime
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-card">
                    <CardContent className="p-4 flex items-center gap-3">
                        <CalendarDays className="h-8 w-8 text-primary" />
                        <div>
                            <p className="text-2xl font-bold font-display">
                                {absentDays}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Absent Days
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-card">
                <CardHeader>
                    <CardTitle className="font-display text-lg">
                        Recent Attendance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {myRecords.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No records yet. Clock in to get started!
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {myRecords.map((rec) => (
                                <div
                                    key={rec.id}
                                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            {rec.date}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {rec.method?.toUpperCase()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-mono text-foreground">
                                            {rec.clock_in
                                                ? new Date(
                                                      rec.clock_in
                                                  ).toLocaleTimeString(
                                                      'en-ZA',
                                                      {
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      }
                                                  )
                                                : '—'}
                                            {' — '}
                                            {rec.clock_out
                                                ? new Date(
                                                      rec.clock_out
                                                  ).toLocaleTimeString(
                                                      'en-ZA',
                                                      {
                                                          hour: '2-digit',
                                                          minute: '2-digit',
                                                      }
                                                  )
                                                : '...'}
                                        </span>
                                        {rec.hours_worked && (
                                            <span className="text-xs text-muted-foreground">
                                                {rec.hours_worked}h
                                            </span>
                                        )}
                                        <Badge
                                            variant="outline"
                                            className="bg-secondary/10 text-secondary border-secondary/20"
                                        >
                                            {rec.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default EmployeeDashboard
