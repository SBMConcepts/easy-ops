'use client'
import LegalPage, { type PolicyVersion } from '../components/legal/PolicyDocument'

const VERSIONS: PolicyVersion[] = [
  {
    version: 'v1.0',
    label: 'v1.0',
    effectiveDate: '14 July 2026',
    sections: [
      {
        heading: 'Disclaimer',
        subheading: '(CPA Section 49 Compliance & Loadshedding Operational Proviso)',
        blocks: [
          {
            type: 'callout',
            variant: 'legal',
            blocks: [
              {
                type: 'paragraph',
                text: '**ALL SYSTEM LOGS, SOFTWARE VERIFICATIONS, CLOCK-IN METRICS, AND WORKFORCE ASSISTANCE SERVICES ACCESSED THROUGH THE EASYOPS SaaS PLATFORM ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS.**',
              },
              {
                type: 'paragraph',
                text: '**EASYOPS EXPRESSLY DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTY OF ACCURACY, COMPLIANCE SUITABILITY FOR LABOR INSPECTIONS, AND FITNESS FOR PAYROLL PREPARATION.**',
              },
            ],
          },
        ],
      },
      {
        heading: '5.1 Loadshedding, Eskom Grid Failure, and Power Outage Proviso',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: 'EasyOps is a cloud-based web and mobile platform requiring active internet connectivity and power to sync devices.',
              },
              {
                text: '**Grid Disruption Policy:** EasyOps is not liable, and holds no responsibility for any delay, platform lag, offline syncing errors, or failure to log workforce check-ins resulting from Eskom loadshedding, municipal infrastructure failures, regional power grid blackouts, or local internet backhaul disruptions.',
              },
              {
                text: 'The Customer must maintain manual, off-grid paper backup logs to ensure employee compliance records during periods of extended national or local power grid failure.',
              },
            ],
          },
        ],
      },
      {
        heading: '5.2 Workforce Disputes and CCMA Exclusion',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: "EasyOps provides a data collection mechanism for the Customer's HR administration.",
              },
              {
                text: '**Arbitration & Dispute Proviso:** EasyOps is not a mediator, legal expert, or labour consultant. EasyOps expressly disclaims any liability for labour disputes, unfair dismissals, salary discrepancies, or overtime arbitration proceedings initiated before the **Commission for Conciliation, Mediation and Arbitration (CCMA)** or the South African Labour Courts.',
              },
              {
                text: 'All data logs pulled from EasyOps are submitted for evidentiary purposes strictly at the discretion and risk of the Customer.',
              },
            ],
          },
        ],
      },
      {
        heading: '5.3 Employment Equity (EE) and B-BBEE Reports',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: 'The platform provides data management to record demographic designations to assist the Customer in generating Employment Equity reports (EEA2/EEA4) and Broad-Based Black Economic Empowerment (B-BBEE) audits.',
              },
              {
                text: 'EasyOps does not verify the accuracy or compliance of these statistics. The Customer remains fully responsible for ensuring that all data inputs and filings comply with the Department of Labour regulations, to avoid tender restrictions and legal penalties.',
              },
            ],
          },
        ],
      },
    ],
  },
]

/** Legal page rendering the versioned EasyOps operational disclaimer (loadshedding, CCMA, EE/B-BBEE). */
export default function Disclaimer() {
  return (
    <LegalPage
      title="Disclaimer"
      subtitle="Warranty disclaimers and operational provisos, including loadshedding, CCMA, and Employment Equity reporting."
      versions={VERSIONS}
    />
  )
}
