/**
 * Auth0 Action: Pre-User-Registration
 * Trigger: User Registration / Pre User Registration
 *
 * Fires BEFORE a new user is persisted in Auth0. Use this to block or
 * enrich registrations before they are created.
 *
 * Responsibilities:
 *  1. Block self-service signups that arrive WITHOUT an org invitation.
 *     EasyOps tenants are provisioned exclusively via POST /api/organizations
 *     (admin self-serve) or POST /api/invitations (invited employees).
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
  if (!isInteractiveSignup) {
    return
  }

  // The org / invitation context can surface in several places depending on the
  // flow (organization invitation vs. org-scoped authorize). Check all of them
  // so a legitimately invited user is never wrongly blocked.
  const params = (event.transaction && event.transaction.params) || {}
  const query = (event.request && event.request.query) || {}
  const body = (event.request && event.request.body) || {}

  const hasInvitation = !!(params.invitation || query.invitation || body.invitation)
  const hasOrgContext = !!(
    (event.organization && event.organization.id) ||
    params.organization ||
    query.organization ||
    body.organization
  )

  // Diagnostic (no secrets): shows which signals were present in the tenant log
  // stream if a signup is unexpectedly blocked.
  console.log(
    'pre-user-registration signals',
    JSON.stringify({
      hasInvitation,
      hasOrgContext,
      orgFromEvent: !!(event.organization && event.organization.id),
      orgFromParams: !!params.organization,
      orgFromQuery: !!query.organization,
      invFromParams: !!params.invitation,
      invFromQuery: !!query.invitation,
    })
  )

  if (!hasInvitation && !hasOrgContext) {
    // api.access.deny requires (code, message) — two arguments
    api.access.deny(
      'unauthorized',
      'Self-service registration is not available. Please ask your workspace administrator to invite you.'
    )
    return
  }

  const orgId =
    (event.organization && event.organization.id) ||
    params.organization ||
    query.organization ||
    body.organization
  if (orgId) {
    api.user.setAppMetadata('org_id', orgId)
  }
}
