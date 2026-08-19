// Amazon SNS client for server-initiated SMS (invitation links, alerts).
// Separate credentials from auth0/actions/custom-phone-provider.js — that
// Action's secrets live only in the Auth0 Dashboard and are not reachable
// from Express, so this module needs its own AWS_* env vars in .env.local.

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'

let _client: SNSClient | undefined

function client(): SNSClient {
  if (_client) return _client

  const region = process.env.AWS_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Missing AWS_REGION/AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY environment variable(s) for SMS sending.'
    )
  }

  _client = new SNSClient({ region, credentials: { accessKeyId, secretAccessKey } })
  return _client
}

/** Send a transactional SMS (e.g. a phone-based invitation link) via Amazon SNS. */
export async function sendSms(phoneNumber: string, message: string): Promise<void> {
  const senderId = process.env.AWS_SNS_SENDER_ID

  await client().send(
    new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
        ...(senderId
          ? { 'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: senderId } }
          : {}),
      },
    })
  )
}
