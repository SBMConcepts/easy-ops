'use client'
import LegalPage, { type PolicyVersion } from '../components/legal/PolicyDocument'

const VERSIONS: PolicyVersion[] = [
  {
    version: 'v1.0',
    label: 'v1.0',
    effectiveDate: '14 July 2026',
    sections: [
      {
        heading: 'Terms & Conditions',
        subheading: '(ECTA Section 43 & CPA Consumer Compliance Disclosure)',
        blocks: [
          {
            type: 'paragraph',
            text: 'In compliance with Section 43 of the **Electronic Communications and Transactions Act 25 of 2002 (ECTA)**, EasyOps makes the following statutory disclosures available to users of this website and associated registration flows.',
          },
        ],
      },
      {
        heading: '2.1 ECTA Section 43 Statutory Disclosure Table',
        blocks: [
          {
            type: 'table',
            columns: ['ECTA Disclosure Metric', 'Statutory Particulars of Provider'],
            rows: [
              ['**Registered Legal Name**', 'EasyOps (Pty) Ltd'],
              ['**Registration Number**', '2026/117190/07'],
              ['**Directors / Office Bearers**', '_[As per CIPC Registration]_'],
              ['**Physical Address**', '_[Provided on request/invoice]_'],
              ['**Telephone Number**', '_[Provided on request]_'],
              ['**Email Address**', '[legal@easyops.co.za](mailto:legal@easyops.co.za)'],
              [
                '**Official Website URL**',
                '[https://easy-ops-com.vercel.app](https://easy-ops-com.vercel.app)',
              ],
              ['**Physical Address for Legal Service**', '_[Provided on request]_'],
              ['**Governing Law**', 'Republic of South Africa'],
              [
                '**Dispute Resolution**',
                'Internal escalations to [compliance@easyops.co.za](mailto:compliance@easyops.co.za); failing which, reference to AFSA (Arbitration Foundation of Southern Africa)',
              ],
            ],
          },
        ],
      },
      {
        heading: '2.2 Product Pricing and VAT Policy',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: 'All pricing for EasyOps tiers, licenses, and per-user seats is displayed in **South African Rand (ZAR)**.',
              },
              {
                text: 'Fees are displayed exclusive of **Value Added Tax (VAT)**, which will be charged at the statutory rate of **15%** where applicable, unless explicitly stated otherwise.',
              },
              {
                text: 'Fees are calculated on a predictable tiered monthly or annual recurring model as selected during checkout.',
              },
            ],
          },
        ],
      },
      {
        heading: '2.3 Order Review, Confirmation, and E-Commerce Flow',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: 'Before concluding any subscription, registration, or activation, the EasyOps signup flow presents a **Review-and-Correct Screen** showing full quantities, price, and terms.',
              },
              {
                text: 'Pursuant to Section 43(2) of ECTA, users can review their order and correct billing errors before confirming.',
              },
              {
                text: 'An electronic order confirmation and copy of this agreement will be emailed to the user immediately upon checkout.',
              },
            ],
          },
        ],
      },
      {
        heading: '2.4 ECTA Section 44 Cooling-Off Proviso',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: 'Section 44 of ECTA grants natural person consumers a **7-day cooling-off period**.',
              },
              {
                text: '**Exclusion Policy:** In terms of Section 42(2) of ECTA, the cooling-off period is strictly excluded once software setup commences, once the service begins with the user’s explicit consent, or once access credentials have been unsealed and active SaaS profiles are created.',
              },
            ],
          },
        ],
      },
    ],
  },
]

export default function TermsAndConditions() {
  return (
    <LegalPage
      title="Terms & Conditions"
      subtitle="Statutory ECTA and consumer-protection disclosures for the EasyOps website and registration flows."
      versions={VERSIONS}
    />
  )
}
