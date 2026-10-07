import { LEGAL_CONTACT, LEGAL_OPERATOR, type LegalDocument } from "./types";

export const TERMS: LegalDocument = {
  title: "Terms of Service",
  summary: {
    heading: "The short version",
    points: [
      "TheOdooAgent is early-stage software, provided as is. We work hard on it, but we make no guarantees about availability or results.",
      "The agent connects to Odoo with each user's own API key, so it can only see and do what Odoo already allows that user. Keeping those keys safe is your responsibility.",
      "Your data is yours. We do not sell it and we do not use it to train AI models.",
      "During the Founding Partner program the service is free. Afterwards, Founding Partners keep a rate of US$1 per active user per month for as long as their account stays active without interruption.",
      "AI answers can be wrong. Check anything important before acting on it.",
    ],
  },
  intro: [
    `These Terms of Service ("Terms") govern your use of TheOdooAgent, including the website at theodooagent.com, the web application and its APIs (together, the "Service"). The Service is operated by ${LEGAL_OPERATOR}, an individual based in New York, USA ("we", "us", "our").`,
    "By creating an account, accepting an invitation or using the Service, you agree to these Terms and to our Privacy Policy. If you use the Service on behalf of a company, you confirm that you are authorized to bind that company, and \"you\" refers to it.",
  ],
  sections: [
    {
      id: "service",
      heading: "1. The Service",
      body: [
        "TheOdooAgent is a conversational assistant that queries and, when you confirm it, updates data in Odoo ERP instances that you connect. It is aimed at businesses, mainly Odoo implementers and partners and the companies they serve. It is not intended for personal or household use, and you must be at least 18 years old to use it.",
        "The Service is in an early stage (beta) and access is currently by invitation only. Features may change, be added or be removed at any time.",
      ],
    },
    {
      id: "accounts",
      heading: "2. Accounts and Odoo access",
      body: [
        "You are responsible for your account credentials and for everything done through your account. Tell us promptly if you believe your account has been compromised.",
        "To connect an Odoo instance you provide its URL, database name, a username and an API key. You confirm that you are authorized to connect that instance and to use those credentials.",
        "The agent acts in Odoo with the permissions of the API key it was given: it can only read or change what Odoo allows that user. We do not bypass Odoo's access rules. It follows that the access you give, and the API keys you load for yourself, your team or your clients' users, are your responsibility. Use dedicated users with the minimum permissions they need.",
        "Changes to Odoo data (creating, updating or running actions on records) are only executed after a user confirms them in the Service. You are responsible for the changes you confirm.",
      ],
    },
    {
      id: "partners",
      heading: "3. Partners and their clients",
      body: [
        "If you are an Odoo implementer or partner and you give your clients or their employees access to the Service, you are responsible for having the right to do so, for your own agreements with them, and for their use of the Service as if it were your own.",
        "With respect to personal data contained in your Odoo instances, you (or your client) act as the data controller and we act as a processor on your behalf. A Data Processing Agreement (DPA) is available on request.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "4. Acceptable use",
      body: [
        "You agree not to:",
        {
          list: [
            "connect systems or use credentials you are not authorized to use;",
            "use the Service to break the law or to infringe anyone's rights;",
            "attempt to access other customers' data, probe or bypass our security, or interfere with the Service;",
            "overload the Service, scrape it, or use automated means to access it beyond normal use;",
            "reverse engineer the Service, or resell it, except as a partner within the program you were invited to.",
          ],
        },
        "We may suspend access that puts the Service, other customers or third parties at risk.",
      ],
    },
    {
      id: "ai",
      heading: "5. AI-generated content",
      body: [
        "Answers are produced with the help of AI models. Although figures are computed from your Odoo data by our own code, answers, summaries, charts and suggestions may be incomplete or wrong. They are not accounting, tax, legal or financial advice. Verify anything important before relying on it.",
      ],
    },
    {
      id: "fees",
      heading: "6. Founding Partner program and fees",
      body: [
        "Free during the program. While the Founding Partner program is running for your organization, the Service is free of charge for you and for the users you invite. The program period for your organization is shown in the application and may be extended by us.",
        "Founder rate. When the program ends, Founding Partners keep a rate of US$1 per active user per month, for as long as that account remains active without interruption, for this product. Taxes are not included. An \"active user\" is a user with enabled access to your organization during the month. If the account is closed or its subscription lapses, the founder rate ends and does not come back.",
        "No surprise charges. We will not charge you anything without telling you at least 30 days in advance and without your explicit subscription. Payments, when they start, will be processed by Stripe.",
        "Prices for anyone outside the program are published separately and may change.",
      ],
    },
    {
      id: "data",
      heading: "7. Your data",
      body: [
        "You keep all rights to your data, including the data in your Odoo instances and the content of your conversations. You give us permission to process it only as needed to provide, secure and support the Service, as described in the Privacy Policy.",
        "We do not sell your data and we do not use it, or allow our AI providers to use it, to train AI models.",
        "If you send us feedback or suggestions, we may use them to improve the Service without any obligation to you.",
      ],
    },
    {
      id: "third-parties",
      heading: "8. Third-party services",
      body: [
        "Odoo is a trademark of Odoo S.A. TheOdooAgent is an independent product and is not affiliated with, endorsed by or sponsored by Odoo S.A.",
        "The Service relies on third-party providers (hosting, authentication, AI models, email and, when enabled, voice). They are listed in the Privacy Policy. Your Odoo instance and its hosting are not part of the Service and we are not responsible for them.",
      ],
    },
    {
      id: "changes",
      heading: "9. Changes, suspension and termination",
      body: [
        "Because the Service is in an early stage, we may change, suspend or discontinue all or part of it. If we discontinue the Service entirely, we will try to give you at least 30 days' notice.",
        "You may stop using the Service at any time and ask us to delete your account. We may suspend or close accounts that breach these Terms.",
      ],
    },
    {
      id: "disclaimer",
      heading: "10. Disclaimer",
      body: [
        "THE SERVICE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\", WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE OR SECURE, OR THAT ITS ANSWERS WILL BE CORRECT. THERE IS NO SERVICE LEVEL AGREEMENT.",
      ],
    },
    {
      id: "liability",
      heading: "11. Limitation of liability",
      body: [
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA OR BUSINESS, ARISING OUT OF OR RELATED TO THE SERVICE.",
        "OUR TOTAL LIABILITY FOR ANY CLAIM RELATED TO THE SERVICE WILL NOT EXCEED THE GREATER OF THE AMOUNTS YOU PAID US FOR THE SERVICE IN THE 12 MONTHS BEFORE THE CLAIM AND US$100.",
        "Some jurisdictions do not allow certain limitations, so some of the above may not apply to you.",
      ],
    },
    {
      id: "indemnity",
      heading: "12. Indemnity",
      body: [
        "You will defend and indemnify us against third-party claims arising from your data, your use of the Service in breach of these Terms or the law, or the access you give to your clients and users.",
      ],
    },
    {
      id: "law",
      heading: "13. Governing law",
      body: [
        "These Terms are governed by the laws of the State of New York, USA, without regard to its conflict-of-laws rules. Any dispute will be resolved exclusively by the state or federal courts located in New York County, New York, and both parties consent to their jurisdiction.",
      ],
    },
    {
      id: "general",
      heading: "14. General",
      body: [
        "Assignment. We may transfer these Terms, together with the Service, to a company we form to operate it or to a successor. We will let you know if that happens. You may not transfer them without our consent.",
        "Changes to these Terms. We may update these Terms. We will notify you of material changes by email or in the application at least 30 days before they take effect. If you keep using the Service after that, the new Terms apply.",
        "Entire agreement. These Terms and the Privacy Policy (and, where signed, a DPA) are the entire agreement between us about the Service. If a provision is found unenforceable, the rest remains in effect. Not enforcing a provision is not a waiver of it.",
        "Language. These Terms are written in English, and the English version prevails over any translation.",
        `Contact: ${LEGAL_CONTACT}.`,
      ],
    },
  ],
};
