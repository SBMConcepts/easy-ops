'use client'
import LegalPage, { type PolicyVersion } from '../components/legal/PolicyDocument'

const VERSIONS: PolicyVersion[] = [
  {
    version: 'v1.0',
    label: 'v1.0',
    effectiveDate: '14 July 2026',
    sections: [
      {
        heading: 'Terms of Service',
        subheading: '(B2B SaaS Enterprise Stack & Data Processing Terms)',
        blocks: [
          {
            type: 'paragraph',
            text: 'These Terms of Service ("ToS") constitute a binding contract between **EasyOps Technologies (Pty) Ltd ("EasyOps")** and the **Customer** (the legal entity, company, or sole proprietor registering for subscription access). By signing up, accessing, or using EasyOps, you warrant that you are legally authorised to bind the Customer.',
          },
          {
            type: 'callout',
            variant: 'info',
            blocks: [
              { type: 'paragraph', text: '**IMPORTANT NOTICE ON SCOPE OF CONTRACT**' },
              {
                type: 'paragraph',
                text: 'EasyOps operates strictly on a **Business-to-Business (B2B)** licensing model.',
              },
              {
                type: 'paragraph',
                text: 'This service is designed for business-related entities managing workforce operations.',
              },
            ],
          },
        ],
      },
      {
        heading: '3.1 Grant of License and Seat Allocation',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: 'EasyOps grants the Customer a non-exclusive, non-transferable, revocable license to access and use the platform for its internal business operations. This is a licensed SaaS subscription, not a sale of software.',
              },
              {
                text: 'Access limits are governed by "seats" or "user thresholds" specified in the Customer\'s order form. Credentials cannot be shared among workforce members. Each worker check-in profile must correspond to an active system profile.',
              },
            ],
          },
        ],
      },
      {
        heading: '3.2 Subscription Fees, Auto-Renewals, and Price Escalation',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: '**Billing Cycles:** All subscriptions are billed annually or monthly in advance. All payments are non-refundable, except as required by South African law.',
              },
              {
                text: '**Auto-Renewal:** Subscriptions will automatically renew for a successive term equal to the initial term, unless the Customer provides written notice of non-renewal at least **30 days** before the current term expires.',
              },
              {
                text: '**Price Escalations:** EasyOps reserves the right to adjust fees on subscription renewal. Price adjustments will be capped at the average Consumer Price Index (CPI) of the preceding 12-month period, or **8%** (whichever is higher).',
              },
            ],
          },
        ],
      },
      {
        heading: '3.3 BCEA & South African Labour Law Compliance Alignment',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: '**Operational Support Only:** EasyOps is a workforce tracking, attendance log, and HR database administrative support tool.',
              },
              {
                text: '**Payroll & BCEA Proviso:** EasyOps does not perform direct payroll calculations or make tax/PAYE/UIF submissions to SARS. The software acts as an attendance administrator that formats raw data to assist the Customer’s HR department or third-party payroll engines.',
              },
              {
                text: 'The Customer holds the absolute statutory responsibility to:',
                children: {
                  ordered: true,
                  items: [
                    { text: 'Verify all attendance logs against actual hours worked.' },
                    {
                      text: 'Confirm BCEA overtime caps (max 10 hours per week paid at 1.5 times ordinary rate).',
                    },
                    { text: 'Ensure statutory meal interval deductions.' },
                    {
                      text: 'Perform correct regulatory calculations before processing monthly payroll.',
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        heading: '3.4 Multi-Tenant Isolated Architecture',
        blocks: [
          {
            type: 'list',
            items: [
              { text: 'EasyOps operates as a secure multi-tenant platform.' },
              {
                text: 'All data belonging to the Customer is logically partitioned and isolated from the data tables of other customers.',
              },
              {
                text: 'Any attempt by the Customer, its administrators, or its workforce to access, query, scan, or bypass security layers to view data from other tenant organizations is a material breach and an offence under the Cybercrimes Act.',
              },
            ],
          },
        ],
      },
      {
        heading: '3.5 B2B Consumer Protection Act (CPA) Proviso',
        blocks: [
          {
            type: 'paragraph',
            text: 'Pursuant to the **Consumer Protection Act 68 of 2008 (CPA)**, the CPA does not apply to transactions between juristic persons whose asset value or annual turnover equals or exceeds **R2,000,000 (Two Million South African Rand)** at the time of transaction.',
          },
          {
            type: 'paragraph',
            text: 'Where the Customer qualifies as a consumer under the CPA (natural person or juristic person below the R2 million threshold):',
          },
          {
            type: 'list',
            items: [
              {
                text: 'No term in this agreement is intended to limit, exclude, or deny any statutory right that cannot be limited by law.',
              },
              {
                text: 'Exclusion, indemnity, and risk assumption terms have been displayed conspicuously in uppercase and bold text as required by Section 49 of the CPA.',
              },
            ],
          },
        ],
      },
      {
        heading: '3.6 Data Processing Addendum (DPA / Section 21 POPIA Agreement)',
        blocks: [
          {
            type: 'paragraph',
            text: 'In accordance with **Section 21 of POPIA**, the Customer (Responsible Party) hereby contracts EasyOps (Operator) to process workforce data subject to the following obligations:',
          },
          {
            type: 'list',
            items: [
              {
                text: "**Written Instruction:** EasyOps shall process workforce personal information solely to provide the services and in accordance with the Customer's written commands.",
              },
              {
                text: '**Confidentiality:** EasyOps ensures that all personnel authorised to process personal information are bound by strict non-disclosure obligations.',
              },
              {
                text: '**Sub-Processors:** EasyOps may only engage sub-processors (e.g., local South African hosting providers) under written contracts that enforce data protection obligations at least as strict as those contained in this ToS.',
              },
              {
                text: '**Assistance:** EasyOps will assist the Customer with reasonable technical tools to fulfil requests from workforce data subjects exercising their rights of access, correction, or deletion under Section 23 of POPIA.',
              },
            ],
          },
        ],
      },
      {
        heading: '3.7 SLA, Uptime Guarantee, and Remediation',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: 'EasyOps targets a **99.9% platform availability (uptime)** commitment per monthly billing cycle, calculated on a 24/7 basis.',
              },
              {
                text: '**Excluded Downtime:** Uptime metrics exclude scheduled maintenance windows (conducted between 00:00 and 04:00 SAST with 48 hours’ notice) and force majeure events (e.g., national power outages, ISP backhaul failures, loadshedding).',
              },
              {
                text: "**Remediation:** If the platform fails to meet the 99.9% uptime target in two consecutive billing cycles, the Customer's sole remedy is to request a service credit equivalent to **10% of their monthly subscription fee** for the affected cycles.",
              },
            ],
          },
        ],
      },
      {
        heading: '3.8 Intellectual Property and License Restrictions',
        blocks: [
          {
            type: 'paragraph',
            text: 'All rights, title, and interest in and to the EasyOps system, source code, UI/UX systems, databases, trademark assets, and documentation remain with EasyOps Technologies (Pty) Ltd.',
          },
          {
            type: 'paragraph',
            text: 'The Customer and its workforce shall not, under any circumstances:',
          },
          {
            type: 'list',
            items: [
              { text: 'Reverse engineer, disassemble, or decompile the software.' },
              {
                text: 'Sublicense, lease, rent, or distribute access credentials to third parties.',
              },
              {
                text: 'Scrape data or attempt to duplicate platform features to build a competing platform.',
              },
            ],
          },
        ],
      },
      {
        heading: '3.9 Limitation of Liability',
        blocks: [
          {
            type: 'callout',
            variant: 'legal',
            blocks: [
              {
                type: 'paragraph',
                text: '**WE LIMIT OUR TOTAL DIRECT LIABILITY ARISING FROM THESE TERMS OR PLATFORM DOWNTIME TO THE ACTUAL FEES PAID BY THE CUSTOMER TO EASYOPS IN THE TWELVE (12) MONTH PERIOD PRECEDING THE CLAIM.**',
              },
              {
                type: 'paragraph',
                text: '**IN NO EVENT WILL EASYOPS BE LIABLE TO THE CUSTOMER FOR INDIRECT, INCIDENTAL, SPECIAL, PUNITIVE, OR CONSEQUENTIAL DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF REVENUE, LOSS OF PROFITS, LABOR COMPLIANCE PENALTIES, DEPARTMENT OF EMPLOYMENT AUDITS, OR DAMAGES ARISING FROM INCORRECT PAYROLL CALCULATION ASSISTANCE.**',
              },
            ],
          },
        ],
      },
    ],
  },
]

/** Legal page rendering the versioned EasyOps terms of service. */
export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      subtitle="The terms that govern your use of the EasyOps platform. Select a version below to review the current or previous terms."
      versions={VERSIONS}
    />
  )
}
