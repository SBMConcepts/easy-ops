// Shared E.164 phone validation, used anywhere an admin-entered mobile
// number is accepted (invitations, organization creation).
export const E164_RE = /^\+[1-9]\d{7,14}$/
