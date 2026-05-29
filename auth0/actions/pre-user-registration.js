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
  // event.transaction is only present for interactive (browser) flows.
  // Programmatic user creation via the Management API (your register route)
  // will NOT trigger this Action, so the check below only applies to
  // users signing up through the Universal Login UI directly.

  const isInteractiveSignup = !!event.transaction

  if (isInteractiveSignup) {
    const hasInvitation = !!(
      event.transaction?.params?.invitation ||
      event.request?.query?.invitation ||
      event.user?.app_metadata?.invitation_token
    )

    const hasOrgContext = !!event.organization?.id

    // Block signups that are not invitation-based
    if (!hasInvitation && !hasOrgContext) {
      api.access.deny(
        'Self-service registration is not available. ' +
          'Please ask your workspace administrator to invite you.'
      )
      return
    }
  }

  // For invited users: pre-stamp the org_id into app_metadata so it is
  // available immediately after creation without waiting for post-login.
  const orgId = event.organization?.id
  if (orgId) {
    api.user.setAppMetadata('org_id', orgId)
  }
}
