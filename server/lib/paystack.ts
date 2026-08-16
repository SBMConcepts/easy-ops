const PAYSTACK_API_BASE_URL = 'https://api.paystack.co'

interface PaystackApiResponse<T> {
  status: boolean
  message: string
  data: T
}

export interface PaystackTransaction {
  authorization_url: string
  reference: string
  status: string
  customer: { customer_code: string } | null
  authorization: {
    authorization_code?: string
    brand?: string
    last4?: string
  } | null
  subscription?: {
    subscription_code?: string
    status?: string
    next_payment_date?: string
  } | null
}

export interface PaystackSubscription {
  subscription_code: string
  status: string
  next_payment_date: string | null
  customer: { customer_code: string } | null
}

export class PaystackError extends Error {
  constructor(
    message: string,
    readonly statusCode: number
  ) {
    super(message)
    this.name = 'PaystackError'
  }
}

function getSecretKey(): string {
  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    throw new PaystackError('Paystack billing is not configured.', 503)
  }
  return secretKey
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${PAYSTACK_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  const payload = (await response.json().catch(() => null)) as PaystackApiResponse<T> | null
  if (!response.ok || !payload?.status) {
    throw new PaystackError(payload?.message || 'Paystack request failed.', response.status)
  }
  return payload.data
}

export function getPaystackPlanCode(plan: string): string {
  const planCodes: Record<string, string | undefined> = {
    starter: process.env.PAYSTACK_PLAN_STARTER,
    growth: process.env.PAYSTACK_PLAN_GROWTH,
    pro: process.env.PAYSTACK_PLAN_PRO,
    enterprise: process.env.PAYSTACK_PLAN_ENTERPRISE,
  }
  const planCode = planCodes[plan]
  if (!planCode) {
    throw new PaystackError('This plan is not available for online billing.', 400)
  }
  return planCode
}

export async function initializeCheckout(input: {
  email: string
  amount: number
  reference: string
  callbackUrl: string
  metadata: Record<string, string>
}): Promise<PaystackTransaction> {
  return request<PaystackTransaction>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: input.amount,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
  })
}

export async function verifyTransaction(reference: string): Promise<PaystackTransaction> {
  return request<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
  })
}

export async function createSubscription(input: {
  customerCode: string
  planCode: string
  authorizationCode: string
  startDate: string
}): Promise<PaystackSubscription> {
  return request<PaystackSubscription>('/subscription', {
    method: 'POST',
    body: JSON.stringify({
      customer: input.customerCode,
      plan: input.planCode,
      authorization: input.authorizationCode,
      start_date: input.startDate,
    }),
  })
}

export async function getSubscriptionManagementLink(subscriptionCode: string): Promise<string> {
  const data = await request<{ link: string }>(
    `/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`,
    { method: 'GET' }
  )
  return data.link
}
