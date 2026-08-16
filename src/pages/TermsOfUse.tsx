'use client'
import LegalPage, { type PolicyVersion } from '../components/legal/PolicyDocument'

const VERSIONS: PolicyVersion[] = [
  {
    version: 'v1.0',
    label: 'v1.0',
    effectiveDate: '14 July 2026',
    sections: [
      {
        heading: 'Terms of Use',
        subheading: '(End-User workforce Access Policy & Cybercrimes Act compliance)',
        blocks: [
          {
            type: 'paragraph',
            text: 'These Terms of Use ("ToU") govern the individual access of administrators, managers, and workforce members (employees and contractors) accessing the EasyOps web portal, time-clock terminal, and mobile app.',
          },
        ],
      },
      {
        heading: '4.1 Account Registration and Credential Security',
        blocks: [
          {
            type: 'list',
            items: [
              {
                text: 'All users must register a unique personal profile using accurate identification parameters.',
              },
              {
                text: 'Users are strictly responsible for maintaining the confidentiality of their passwords and personal credentials.',
              },
              {
                text: "Sharing account credentials, pin codes, or QR login profiles among workforce members is prohibited. Any login action taken using a user's profile is legally presumed to have been executed by that specific user.",
              },
            ],
          },
        ],
      },
      {
        heading: '4.2 Acceptable Use Rules',
        blocks: [
          {
            type: 'paragraph',
            text: 'Users agree to use EasyOps solely for lawful, business-authorised workforce tracking purposes. Users shall not:',
          },
          {
            type: 'list',
            items: [
              {
                text: 'Upload, insert, or transmit any malware, virus, Trojan horse, or destructive script.',
              },
              {
                text: 'Input intentionally fraudulent or deceptive clock-in records, time-logs, or locations.',
              },
              {
                text: "Attempt to bypass or probe the platform's API networks, authentication parameters, or endpoint security layers.",
              },
            ],
          },
        ],
      },
      {
        heading: '4.3 South African Cybercrimes Act 19 of 2020 Compliance Mandates',
        blocks: [
          {
            type: 'paragraph',
            text: 'By accessing EasyOps, you acknowledge that any unauthorized interaction with our digital networks is governed by the **Cybercrimes Act 19 of 2020**. Under South African law, the following actions constitute serious criminal offences:',
          },
          {
            type: 'list',
            items: [
              {
                text: '**Unlawful Access (Section 2):** Intentionally bypassing security measures to access EasyOps databases, code, or another Customer’s data tables without explicit authorisation.',
                note: '_Penalty: A fine or imprisonment for up to 5 years, or both._',
              },
              {
                text: '**Data Interference (Section 5):** Intentionally deleting, altering, corrupting, or modifying any platform data, program, or operational code (including time clocks or database records).',
                note: '_Penalty: A fine or imprisonment for up to 10 years, or both._',
              },
              {
                text: '**Cyber Fraud (Section 8):** Intentionally manipulating timesheets, biometric credentials, location metrics, or employee calculations using digital code to cause actual or potential prejudice to an employer or third party.',
              },
              {
                text: '**Cyber Extortion (Section 10):** Threatening to disrupt the system, freeze data, or reveal company workforce info to obtain an illegal financial advantage.',
              },
            ],
          },
          {
            type: 'callout',
            variant: 'legal',
            blocks: [
              {
                type: 'paragraph',
                text: '**EASYOPS RESERVES THE RIGHT TO DISCLOSE TELEMETRY DATA, SYSTEM EVENT RECORDS, AND LOG FILES TO COOPERATE WITH SOUTH AFRICAN LAW ENFORCEMENT INVESTIGATORS IN COMPLIANCE WITH SECTION 54 REPORTING OBLIGATIONS UNDER THE CYBERCRIMES ACT.**',
              },
            ],
          },
        ],
      },
    ],
  },
]

/** Legal page rendering the versioned EasyOps terms of use (end-user access rules). */
export default function TermsOfUse() {
  return (
    <LegalPage
      title="Terms of Use"
      subtitle="The end-user access rules governing owners, administrators, managers, and workforce members using EasyOps."
      versions={VERSIONS}
    />
  )
}
