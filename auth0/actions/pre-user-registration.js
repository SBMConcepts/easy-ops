/**
 * Auth0 Action: Pre-User-Registration
 * Trigger: User Registration / Pre User Registration
 *
 * Fires BEFORE a new user is persisted in Auth0. Use this to block or
 * enrich registrations before they are created.
 *
 * Responsibilities:
 *  1. Block self-service signups that arrive WITHOUT an org invitation.
 *     EasyOps tenants are provisioned exclusively via POST /api/auth/register
 *     (admin self-serve) or POST /api/employees/invite (invited employees).
 *     Direct signups to the Auth0 /authorize endpoint without an invitation
 *     token should be rejected to prevent orphaned users.
 *  2. For valid invitation-based signups, allow and pre-populate metadata.
 *
 * Required Secrets: none — this Action uses only event data.
 */

exports.onExecutePreUserRegistration = async (event, api) => {
  // Programmatic creation via the Management API does not trigger this Action.
  // Only interactive (browser) signups reach this point.
  const isInteractiveSignup = !!event.transaction

  if (isInteractiveSignup) {
    const hasInvitation = !!(
      event.transaction &&
      event.transaction.params &&
      event.transaction.params.invitation
    )
    const hasOrgContext = !!(event.organization && event.organization.id)

    if (!hasInvitation && !hasOrgContext) {
      // api.access.deny requires (code, message) — two arguments
      api.access.deny(
        'unauthorized',
        'Self-service registration is not available. Please ask your workspace administrator to invite you.'
      )
      return
    }
  }

  if (event.organization && event.organization.id) {
    api.user.setAppMetadata('org_id', event.organization.id)
  }
}
