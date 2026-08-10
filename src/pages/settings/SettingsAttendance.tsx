import { useAttendanceRecords } from '../../hooks/useOrgData'
import { Loader2 } from 'lucide-react'
import '../../styles/settings.css'

/** Settings tab showing the current user's own attendance history. */
export default function SettingsAttendance() {
  const { data: myAttendance = [], isLoading: loadingAttendance } = useAttendanceRecords()

  return (
    <div className="settings-card-tab">
      <div className="settings-card-tab__header ">
        <h2 className="settings-card-tab__title ">Attendance History</h2>
        <p className="settings-card-tab__desc ">
          A summary audit track of your active attendance allocations.
        </p>
      </div>

      <div className="settings-card-tab__content">
        {loadingAttendance ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : myAttendance.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <p className="settings-card-tab__desc">No attendance records found.</p>
          </div>
        ) : (
          <div className="settings-activity-list ">
            {myAttendance.map((r, i) => (
              <div key={i} className="settings-activity-row ">
                <div className="flex flex-col gap-1">
                  <span className="settings-activity-row__date">{r.date}</span>
                  <span className="settings-activity-row__method ">{r.method}</span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="settings-activity-row__hours">
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
