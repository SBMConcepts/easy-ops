import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { useComplianceCheck } from '../hooks/useOrgData'
import { Shield, FileCheck, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { ComplianceSettings } from '../components/ComplianceSettings'

const Compliance: React.FC = () => {
  const { data, isLoading } = useComplianceCheck()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )
  }

  const {
    compliance_score: complianceScore = 100,
    pass_count: passCount = 0,
    total_checks: totalChecks = 0,
    violations = [],
  } = data ?? {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
          Workspace Compliance Overview
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure organization-wide legal thresholds and working hours parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-secondary/30 border shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            <Shield className="h-8 w-8 text-secondary mx-auto" />
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Health Rating Score
            </p>
            <div className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
              {complianceScore}%
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            <FileCheck className="h-8 w-8 text-primary mx-auto" />
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Passed Audits Checks
            </p>
            <div className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
              {passCount}{' '}
              <span className="text-sm font-normal text-muted-foreground">/ {totalChecks}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-6 text-center space-y-2">
            <AlertTriangle
              className={`h-8 w-8 mx-auto ${violations.length > 0 ? 'text-destructive' : 'text-muted-foreground/40'}`}
            />
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Open Breaches Flags
            </p>
            <div className="text-4xl font-extrabold tracking-tight text-foreground font-mono">
              {violations.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="border-b border-border bg-muted/10">
          <CardTitle className="text-base font-semibold">
            Active BCEA Operational Violations Logs
          </CardTitle>
          <CardDescription>
            Real-time checks generated across systemic transaction audits
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {violations.length === 0 ? (
            <div className="flex items-center gap-3 py-6 justify-center text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-secondary" />
              <p className="text-sm font-medium">
                All workspace records confirm with compliance targets perfectly.
              </p>
            </div>
          ) : (
            <div className="space-y-1 divide-y divide-border">
              {violations.map((v, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between py-4 first:pt-0 last:pb-0 gap-4"
                >
                  <div className="flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground tracking-tight">
                        {v.reasons.join(' · ')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground/80">Employee Reference:</span>{' '}
                        {v.employee_id?.slice(0, 8)} · Week of {v.week_start}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/20 text-xs font-semibold shrink-0 uppercase tracking-wider"
                  >
                    Violation Action Required
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ComplianceSettings />
    </div>
  )
}

export default Compliance
