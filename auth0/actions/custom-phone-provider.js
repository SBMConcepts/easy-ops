/**
 * Auth0 Custom Phone Provider Action
 * Trigger: custom-phone-provider (Dashboard-only — not listed in the Actions
 * Library; can only be edited from Branding > Phone Provider > Custom >
 * Provider Configuration, or via "Edit in Expanded Editor" from that page).
 *
 * Configured Delivery Method: Text (SMS only). Sends the rendered
 * notification text to the recipient via Amazon SNS.
 *
 *
 * Required secrets (add via the Phone Provider code editor's Secrets panel):
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *   AWS_SNS_SENDER_ID (optional — alphanumeric sender id, if your AWS region
 *   and destination country support it)
 *
 * The backing AWS IAM user/role should be scoped to sns:Publish only.
 */

const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns')

exports.onExecuteCustomPhoneProvider = async (event, api) => {
  // This tenant only configures the "Text" delivery method; ignore anything else.
  if (event.notification.delivery_method !== 'text') {
    return
  }

  const client = new SNSClient({
    region: event.secrets.AWS_REGION,
    credentials: {
      accessKeyId: event.secrets.AWS_ACCESS_KEY_ID,
      secretAccessKey: event.secrets.AWS_SECRET_ACCESS_KEY,
    },
  })

  const messageAttributes = {
    'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
  }
  if (event.secrets.AWS_SNS_SENDER_ID) {
    messageAttributes['AWS.SNS.SMS.SenderID'] = {
      DataType: 'String',
      StringValue: event.secrets.AWS_SNS_SENDER_ID,
    }
  }

  try {
    await client.send(
      new PublishCommand({
        PhoneNumber: event.notification.recipient,
        Message: event.notification.as_text,
        MessageAttributes: messageAttributes,
      })
    )
  } catch (err) {
    console.error(
      '[custom-phone-provider] SNS publish failed:',
      err && err.message ? err.message : err
    )
    // Recoverable — let Auth0 retry (up to 5x) rather than silently dropping the code.
    api.notification.retry(err && err.message ? err.message : 'SNS publish failed')
  }
}
