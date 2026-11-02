'use client'
import LegalPage, { type PolicyVersion } from '../components/legal/PolicyDocument'

const V1_0: PolicyVersion = {
  version: 'v1.0',
  label: 'v1.0',
  effectiveDate: '14 July 2026',
  sections: [
    {
      heading: 'Privacy Notice',
      subheading: '(POPIA & PAIA Compliant Privacy Notice)',
      blocks: [
        {
          type: 'paragraph',
          text: 'This Privacy Policy explains how EasyOps collects, processes, stores, and protects Personal Information in its capacity as a B2B SaaS platform under the **Protection of Personal Information Act 4 of 2013 (POPIA)**.',
        },
        {
          type: 'callout',
          variant: 'info',
          blocks: [
            { type: 'paragraph', text: '**IMPORTANT POPIA CONTEXTUAL DISTINCTION**' },
            {
              type: 'list',
              ordered: true,
              items: [
                {
                  text: '**CUSTOMER** (Juristic/Natural Person purchasing subscriptions) = **RESPONSIBLE PARTY**',
                },
                {
                  text: '**WORKFORCE** (Employees (“Members”)/Contractors of Customer registering on platform) = **DATA SUBJECTS**',
                },
                { text: '**EASYOPS** ((Pty) Ltd EasyOps) = **OPERATOR** (Data Processor)' },
              ],
            },
            {
              type: 'paragraph',
              text: '_As an Operator, EasyOps processes all workforce records solely on the written instruction of the Customer and maintains absolute data sovereignty within South African borders._',
            },
          ],
        },
      ],
    },
    {
      heading: '1.1 Types of Information Collected and Processed',
      blocks: [
        {
          type: 'paragraph',
          text: 'To deliver workforce management, attendance tracking, and payroll support, EasyOps processes:',
        },
        {
          type: 'list',
          items: [
            {
              text: '**Customer Registration Information:** Legal entity details, registration numbers, tax/VAT details, physical addresses, billing contact names, and emails.',
            },
            {
              text: '**Workforce Personal Information (on behalf of Customer):** Full names, South African identity numbers or passport numbers, contact numbers, email addresses, employee numbers, job descriptions, and leave records.',
            },
            {
              text: '**Workforce Special Personal Information & Biometrics:** GPS location check-in data, facial images, or verification vectors (where biometric check-in is enabled by Customer), and basic health check logs.',
            },
            {
              text: '**Juristic Person Protection:** Unlike the GDPR, POPIA protects the data rights of legal entities. EasyOps extends all security and data processing protections to our B2B customers.',
            },
          ],
        },
      ],
    },
    {
      heading: '1.2 Legal Basis and Purpose of Processing',
      blocks: [
        {
          type: 'paragraph',
          text: 'Processing is performed under the instruction of the Customer for the following lawful bases:',
        },
        {
          type: 'list',
          items: [
            {
              text: '**Contractual Necessity:** To execute the workforce tracking and platform operational agreements with the Customer.',
            },
            {
              text: '**Legal Obligations:** To support the Customer in meeting statutory retention obligations under the _Basic Conditions of Employment Act (BCEA)_, _Labour Relations Act (LRA)_, and SARS requirements.',
            },
            {
              text: '**Consent:** Where biometric check-in or sensitive tracking is requested, the Customer warrants they have collected appropriate, un-coerced written consent from their employees.',
            },
          ],
        },
      ],
    },
    {
      heading: '1.3 Data Sovereignty and Storage Locations',
      blocks: [
        {
          type: 'list',
          items: [
            {
              text: '**South African Infrastructure:** In line with our South Africa-first policy, all primary hosting environments, database instances, and backup servers are maintained within physical data centres located inside the borders of the Republic of South Africa.',
            },
            {
              text: '**Cross-Border Policy:** EasyOps does not transfer any customer or workforce personal information outside the Republic of South Africa unless contractually requested by the Customer and legally approved in writing by the EasyOps board of directors, subject to Section 72 of POPIA.',
            },
          ],
        },
      ],
    },
    {
      heading: '1.4 Security Safeguards (Section 19 POPIA compliance)',
      blocks: [
        {
          type: 'paragraph',
          text: 'EasyOps establishes and maintains robust technical and organisational security measures:',
        },
        {
          type: 'list',
          items: [
            {
              text: '**Access Controls & Isolation:** Multi-tenant logical isolation mechanisms. No client tenant can access, view, or intercept the data storage tables of another tenant.',
            },
            {
              text: '**Data Security:** Encryption of data at rest and in transit using advanced transport layer security.',
            },
            {
              text: '**Device Management:** Restrictive administrative privilege protocols for EasyOps engineering teams.',
            },
            {
              text: '**System Vulnerability Protection:** Continuous automated security logs, password hashing, and multi-factor authentication (MFA) enforcement.',
            },
          ],
        },
      ],
    },
    {
      heading: '1.5 Security Breach Notification (Section 22 POPIA compliance)',
      blocks: [
        {
          type: 'paragraph',
          text: 'Where there are reasonable grounds to believe that Personal Information has been accessed or acquired by an unauthorised person:',
        },
        {
          type: 'list',
          items: [
            {
              text: 'EasyOps will notify the impacted Customer (Responsible Party) in writing within **24 to 72 hours**.',
            },
            {
              text: 'The notification will detail the nature of the breach, suspected volumes, affected parameters, mitigation measures taken, and the contact details of the Information Officer.',
            },
            {
              text: 'The Customer, as the Responsible Party, bears the legal obligation under POPIA to notify the South African Information Regulator and the affected workforce data subjects. EasyOps will assist with technical telemetry.',
            },
          ],
        },
      ],
    },
    {
      heading: '1.6 Data Retention, Deletion, and Return',
      blocks: [
        {
          type: 'list',
          items: [
            {
              text: 'EasyOps retains personal information only to support platform delivery or as directed by the Customer.',
            },
            {
              text: 'Upon termination of a Customer subscription, EasyOps offers a **90-day retention window** to allow the Customer to export historical attendance and payroll support data.',
            },
            {
              text: "Following this 90-day window, or on the Customer's express instruction, all records are permanently purged or anonymised using secure destruction methodologies, subject to any contrary statutory data-keeping laws.",
            },
          ],
        },
      ],
    },
    {
      heading: '1.7 Information Officer Contact Details',
      blocks: [
        {
          type: 'paragraph',
          text: 'For any privacy queries, access requests (PAIA), or corrections under Section 24 of POPIA, contact:',
        },
        {
          type: 'list',
          items: [
            { text: '**EasyOps Information Officer**' },
            { text: '**Email:** [admin@easyops.co.za](mailto:admin@easyops.co.za)' },
          ],
        },
      ],
    },
  ],
}

const [NOTICE, INFO_COLLECTED, LEGAL_BASIS, , SECURITY, BREACH, RETENTION, OFFICER] = V1_0.sections

const V1_1: PolicyVersion = {
  version: 'v1.1',
  label: 'v1.1',
  effectiveDate: '2 November 2026',
  sections: [
    NOTICE,
    INFO_COLLECTED,
    LEGAL_BASIS,
    {
      heading: '1.3 Data Sovereignty and Storage Locations',
      blocks: [
        {
          type: 'list',
          items: [
            {
              text: '**South Africa-first:** EasyOps prioritises hosting workforce records on infrastructure located in the Republic of South Africa wherever it is available.',
            },
            {
              text: '**Cross-Border Processing:** Some service providers listed in section 1.9 (for example identity, SMS, email and payment providers) may process limited personal information outside South Africa. This is done only where the recipient is subject to law, binding rules or an agreement that provides an adequate level of protection, as required by Section 72 of POPIA.',
            },
          ],
        },
      ],
    },
    SECURITY,
    BREACH,
    RETENTION,
    {
      heading: '1.7 Sign-In with Google and Google User Data',
      blocks: [
        {
          type: 'paragraph',
          text: 'EasyOps lets users sign in with a Google account. Sign-in is handled by our identity provider, Auth0, and requests only the basic **openid, profile and email** permissions.',
        },
        {
          type: 'list',
          items: [
            {
              text: '**Google data we receive:** your Google account identifier, name, email address and profile picture. We do **not** access your Gmail, Google Drive, Google Calendar, contacts or any other Google service data.',
            },
            {
              text: '**How we use it:** solely to authenticate you, link the sign-in to the invitation or account created for you by your employer (the Customer), and display your name and picture inside your EasyOps workspace.',
            },
            {
              text: '**What we do not do:** we do not sell Google user data, use it for advertising or profiling, transfer it to data brokers, or use it to train generative AI or machine learning models.',
            },
            {
              text: '**Sharing:** Google user data is shared only with the service providers that run EasyOps (see section 1.9), and with your employer’s authorised administrators within the same workspace, or where required by law.',
            },
            {
              text: '**Storage and retention:** Google-derived profile data is stored with your EasyOps account and handled in line with section 1.6. It is deleted or anonymised when the account is removed or on the Customer’s instruction.',
            },
            {
              text: '**Your controls:** you can revoke EasyOps’s access at any time at [myaccount.google.com/permissions](https://myaccount.google.com/permissions), and request access, correction or deletion by contacting the Information Officer in section 1.12.',
            },
          ],
        },
        {
          type: 'paragraph',
          text: 'EasyOps’s use and transfer of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including its Limited Use requirements.',
        },
      ],
    },
    {
      heading: '1.8 Cookies and Sessions',
      blocks: [
        {
          type: 'paragraph',
          text: 'EasyOps uses a single first-party, encrypted session cookie to keep you signed in. It is strictly necessary for the service, is not used for advertising, and is removed when you sign out or the session expires. EasyOps does not use third-party advertising or cross-site tracking cookies.',
        },
      ],
    },
    {
      heading: '1.9 Service Providers (Sub-Processors)',
      blocks: [
        {
          type: 'paragraph',
          text: 'EasyOps uses the following categories of providers, each bound by confidentiality and data protection obligations:',
        },
        {
          type: 'list',
          items: [
            { text: '**Authentication:** Auth0 (sign-in with email, phone or Google).' },
            { text: '**Database and storage:** Supabase.' },
            { text: '**Application hosting:** Vercel.' },
            {
              text: '**SMS delivery:** Amazon Web Services (SNS) for one-time passcodes and invitations.',
            },
            { text: '**Email delivery:** Resend.' },
            {
              text: '**Payments:** Paystack, which processes card details directly; EasyOps does not store full card numbers.',
            },
          ],
        },
      ],
    },
    {
      heading: '1.10 Children',
      blocks: [
        {
          type: 'paragraph',
          text: 'EasyOps is a business service intended for use by employers and their workforce. It is not directed at, and we do not knowingly collect personal information from, anyone under 18.',
        },
      ],
    },
    {
      heading: '1.11 Changes to this Policy',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may update this policy from time to time. The current version and its effective date are shown at the top of this page, and previous versions remain available for reference.',
        },
      ],
    },
    { ...OFFICER, heading: '1.12 Information Officer Contact Details' },
  ],
}

const VERSIONS: PolicyVersion[] = [V1_1, V1_0]

/** Legal page rendering the versioned EasyOps privacy policy. */
export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      subtitle="How EasyOps collects, uses, and protects your information. Select a version below to review the current or previous policies."
      versions={VERSIONS}
    />
  )
}
