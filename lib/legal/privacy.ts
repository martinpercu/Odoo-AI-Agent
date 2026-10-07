import { LEGAL_CONTACT, LEGAL_OPERATOR, type LegalDocument } from "./types";

// ⚠️ Every statement here has to be TRUE of the running system, not of a plan. Checked
// against odoo-agent-back on 2026-10-07: 45s read cache (`result_cache.py`), Fernet for
// stored API keys (`tenancy.py`), 22-day demo visitor purge (`purge_expired_demo_visitors`),
// hashed IP in analytics (`analytics.py`), OpenAI as the default LLM (`llm.py`), Groq for
// STT (`voice/stt.py`), Unreal Speech for TTS (`voice/tts.py`). If any of those changes,
// this text changes with it — and bump LEGAL_VERSION.

export const PRIVACY: LegalDocument = {
  title: "Privacy Policy",
  summary: {
    heading: "What matters most",
    points: [
      "We do not copy or store your Odoo database. The agent reads what it needs at the moment you ask, and discards it.",
      "The agent connects with each user's own API key, so nobody sees anything in the Service that Odoo does not already let them see.",
      "Your data is never used to train AI models. Our AI provider, OpenAI, processes it under Zero Data Retention.",
      "Odoo API keys are stored encrypted.",
      "Your conversations are saved so you can return to them, and you can delete them whenever you want.",
    ],
  },
  intro: [
    `This Privacy Policy explains what data TheOdooAgent (the "Service"), operated by ${LEGAL_OPERATOR} from New York, USA ("we", "us"), collects, how it is used and what choices you have.`,
    "For your account data we are the data controller. For the data in your Odoo instances and the business information that appears in your conversations, the organization that uses the Service (you, or the client of an Odoo partner) is the controller, and we process that data on its behalf.",
  ],
  sections: [
    {
      id: "collect",
      heading: "1. What we collect",
      body: [
        {
          list: [
            "Account data: your email address, your organization, your role and your preferences (language, time zone). Passwords are handled by our authentication provider. We never see them in plain text.",
            "Odoo connection data: instance URL, database name, username and API key. API keys are encrypted before they are stored.",
            "Conversations: the questions you ask and the answers you receive. Answers can include data from your Odoo (for example a customer's name or an amount), so that data stays in the conversation until you delete it.",
            "Things you save: dashboard items (pins), routines and their results, and exports you generate.",
            "Action log: a record of the changes to Odoo that a user confirmed through the Service.",
            "Feedback: when you report an answer, we store your comment, the category, the recent messages of that conversation and who sent the report, so we can reproduce and fix the problem.",
            "Voice (only if your organization enables it): audio you record is sent for transcription and is not stored by us. Spoken answers are generated from a summary of the response.",
            "Usage data: product and website analytics events (for example, which pages and features are used), a random session identifier, campaign parameters and a one-way hash of your IP address. We do not store your raw IP address in our analytics.",
          ],
        },
      ],
    },
    {
      id: "odoo",
      heading: "2. How your Odoo data is handled",
      body: [
        "When you ask a question, the Service queries your Odoo instance live using the API key of the user asking. Odoo's own access rules apply, so the agent can only read or change what that user is allowed to.",
        "Results are kept in memory for at most 45 seconds to avoid repeating identical queries, and are discarded after that. We do not keep a copy of your Odoo database.",
        "Figures are computed by our own code. To write the answer, the AI model receives your question, the already computed result and recent turns of the conversation. It does not receive your API keys or direct access to your Odoo.",
      ],
    },
    {
      id: "use",
      heading: "3. How we use data",
      body: [
        {
          list: [
            "to provide the Service and answer your questions;",
            "to keep the Service secure and prevent abuse;",
            "to provide support and investigate the problems you report;",
            "to improve the product, using feedback reports and aggregated usage;",
            "to send you service emails, such as invitations, password recovery and notices about these policies.",
          ],
        },
        "We do not sell personal data, we do not use it for advertising, and we do not use it to train AI models.",
      ],
    },
    {
      id: "subprocessors",
      heading: "4. Service providers (subprocessors)",
      body: [
        "We rely on these providers to run the Service. Each one only receives what it needs for its purpose.",
        {
          table: {
            head: ["Provider", "Purpose", "When"],
            rows: [
              ["Supabase", "User authentication", "Always"],
              ["Railway", "Hosting of our backend and database (USA)", "Always"],
              ["Vercel", "Hosting of the web application", "Always"],
              ["OpenAI", "AI model that writes the answers, under Zero Data Retention", "Always"],
              ["Zoho", "Transactional email", "Always"],
              ["Groq", "Speech-to-text transcription", "Only if voice input is enabled"],
              ["Unreal Speech", "Text-to-speech", "Only if spoken answers are enabled"],
              ["Stripe", "Payment processing", "Only once paid plans start"],
            ],
          },
        },
        "If we add or replace a provider that processes customer data, we will update this list.",
      ],
    },
    {
      id: "transfers",
      heading: "5. Where data is processed",
      body: [
        "We and our main providers are located in the United States, so your data is processed there. If you are in another country, you understand that your data will be transferred to the United States. Where the law of your country requires specific safeguards for that transfer, a DPA is available on request.",
      ],
    },
    {
      id: "retention",
      heading: "6. How long we keep data",
      body: [
        {
          list: [
            "Conversations, pins and routines: until you delete them, or until your account is deleted.",
            "Odoo API keys: until you remove the connection or your account is deleted.",
            "Demo without an account: conversations from the public demo are deleted automatically after 22 days without use.",
            "Feedback reports and the action log: kept while your account is active, to support and improve the Service. You can ask us to delete them.",
            "Account data: while your account is active. When you ask us to delete your account, we delete it and its associated data within 30 days.",
          ],
        },
        "Copies may remain for a limited time in our providers' backups and logs before they are overwritten.",
      ],
    },
    {
      id: "security",
      heading: "7. Security",
      body: [
        "Connections are encrypted in transit (HTTPS). Odoo API keys are encrypted at rest. Each organization only accesses its own data, roles limit what each user can do in the Service, and changes to Odoo require explicit confirmation. No system is completely secure. If we learn of a breach affecting your data, we will notify you without undue delay.",
      ],
    },
    {
      id: "rights",
      heading: "8. Your rights",
      body: [
        `You can access, correct, export or delete your personal data, and object to or restrict some uses of it. You can delete conversations yourself in the application. For anything else, write to ${LEGAL_CONTACT} and we will answer within 30 days.`,
        "If you use the Service through an Odoo partner or your employer, they control your data. Contact them first. We will help them respond.",
        "Depending on where you live, you may also have the right to complain to your data protection authority.",
      ],
    },
    {
      id: "storage",
      heading: "9. Cookies and browser storage",
      body: [
        "We use your browser's local storage to keep you signed in and to remember your preferences (theme, language, active instance, voice settings) and, in the public demo, an anonymous visitor identifier. We do not use advertising or third-party tracking cookies. Our analytics are first-party.",
      ],
    },
    {
      id: "children",
      heading: "10. Children",
      body: ["The Service is for businesses and is not directed to anyone under 18."],
    },
    {
      id: "changes",
      heading: "11. Changes and contact",
      body: [
        "We will notify you of material changes to this policy by email or in the application before they take effect.",
        `Questions or requests: ${LEGAL_CONTACT}.`,
      ],
    },
  ],
};
