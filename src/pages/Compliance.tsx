import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Shield, FileCheck, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { useComplianceCheck } from '../hooks/useTenantData'

const Compliance = () => {
  const { data, isLoading } = useComplianceCheck()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  const complianceScore = data?.compliance_score ?? 100
  const passCount = data?.pass_count ?? 0
  const totalChecks = data?.total_checks ?? 0
  const violations = data?.violations ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Compliance & Audit</h1>
        <p className="text-muted-foreground text-sm mt-1">
          BCEA & IRA compliance monitoring and audit trails
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="shadow-card border-secondary/20 border-2">
          <CardContent className="p-6 text-center">
            <Shield className="h-10 w-10 text-secondary mx-auto mb-2" />
            <p className="text-3xl font-bold font-display text-foreground">{complianceScore}%</p>
            <p className="text-sm text-muted-foreground mt-1">Compliance Score</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center">
            <FileCheck className="h-10 w-10 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold font-display text-foreground">
              {passCount}/{totalChecks}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Checks Passed</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center">
            <Clock className="h-10 w-10 text-accent mx-auto mb-2" />
            <p className="text-3xl font-bold font-display text-foreground">{violations.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Violations Found</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">Compliance Results</CardTitle>
          <CardDescription>
            Automated checks against BCEA requirements for this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <div className="flex items-center gap-3 py-4">
              <CheckCircle2 className="h-6 w-6 text-secondary" />
              <p className="text-sm text-foreground">
                All checks passed. No BCEA violations detected.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {violations.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-3 border-b border-border last:border-0"
                >
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{v.rule}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.name}: {v.detail}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-destructive/10 text-destructive border-destructive/20"
                  >
                    Violation
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Compliance
