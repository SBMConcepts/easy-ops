import { useAttendanceRecords } from '../../hooks/useOrgData'
import { Loader2 } from 'lucide-react'

export default function SettingsAttendance() {
  const { data: myAttendance = [], isLoading: loadingAttendance } = useAttendanceRecords()

  return (
    <div className="settings-card-tab bg-white border rounded-lg p-6 shadow-sm">
      <div className="settings-card-tab__header mb-6">
        <h2 className="settings-card-tab__title text-lg font-semibold">Attendance History</h2>
        <p className="settings-card-tab__desc text-sm text-muted-foreground">
          A summary audit track of your active attendance allocations.
        </p>
      </div>

      <div className="settings-card-tab__content">
        {loadingAttendance ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : myAttendance.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">No attendance records found.</p>
          </div>
        ) : (
          <div className="settings-activity-list space-y-3">
            {myAttendance.map((r, i) => (
              <div
                key={i}
                className="settings-activity-row flex items-center justify-between p-3 bg-muted/50 rounded-md border"
              >
                <div className="flex flex-col">
                  <span className="settings-activity-row__date font-medium">{r.date}</span>
                  <span className="settings-activity-row__method text-xs text-muted-foreground uppercase">
                    {r.method}
                  </span>
                </div>
                <div className="text-right">
                  <span className="settings-activity-row__hours font-semibold text-primary">
                    {r.hours_worked}h{r.overtime ? ` +${r.overtime}h OT` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
