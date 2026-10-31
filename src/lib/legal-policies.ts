export const POLICY_SLUGS = ['terms', 'privacy', 'refund-policy', 'merchant-agreement', 'customer-agreement'] as const
export type PolicySlug = (typeof POLICY_SLUGS)[number]
export interface PolicySection { title: string; body: string }
export interface LegalPolicy {
  slug: PolicySlug
  title: string
  description: string
  sections: PolicySection[]
  updated_at: string | null
}

export const DEFAULT_POLICIES: Record<PolicySlug, LegalPolicy> = {
  "terms": {
    "slug": "terms",
    "title": "Terms & Conditions",
    "description": "Please read these terms and conditions carefully before using our platform, registering as a merchant partner, or participating in loyalty campaigns.",
    "sections": [
      {
        "title": "1. Acceptance of Terms",
        "body": "By accessing and registering on our platform as a merchant or user, you agree to comply with and be bound by these Terms and Conditions. If you do not agree to these terms, please refrain from using our services."
      },
      {
        "title": "2. Merchant Accounts & Registration",
        "body": "Merchant partners must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and all activities that occur under your account."
      },
      {
        "title": "3. Rewards, Benefits & Campaigns",
        "body": "Platform benefits, e-commerce reward points, promotional pricing, and campaign access are subject to eligibility criteria, merchant categories, and active membership levels managed by the administration."
      },
      {
        "title": "4. User Privacy & Data Protection",
        "body": "We respect your data and maintain robust security standards. All personal and business data provided is utilized strictly for platform operations, merchant analytics, and verified communication services."
      },
      {
        "title": "5. Modifications & Updates",
        "body": "We reserve the right to update, modify, or replace any part of these Terms and Conditions at our sole discretion. Continued use of the platform following any changes constitutes acceptance of those changes."
      },
      {
        "title": "6. Governing Law",
        "body": "These terms shall be governed by and construed in accordance with local regulatory guidelines and applicable commercial laws without regard to conflict of law provisions."
      }
    ],
    "updated_at": null
  },
  "privacy": {
    "slug": "privacy",
    "title": "Privacy Policy",
    "description": "Learn how we collect, use, and protect your personal and business information.",
    "sections": [
      {
        "title": "1. Information We Collect",
        "body": "We collect information you provide directly during registration, including merchant business details, contact numbers, email addresses, and operational categories required for ecosystem access."
      },
      {
        "title": "2. How We Use Your Data",
        "body": "Your data is utilized to manage merchant accounts, deliver personalized reward points, process commercial discounts, facilitate campaign participation, and improve overall platform functionality."
      },
      {
        "title": "3. Data Security & Protection",
        "body": "We implement robust technical and organizational security measures to protect your sensitive business records against unauthorized access, alteration, disclosure, or destruction."
      },
      {
        "title": "4. Information Sharing",
        "body": "We do not sell or trade your personal or business information. Data is only shared with verified service partners or administrators strictly bound by confidentiality obligations."
      },
      {
        "title": "5. Cookie Tracking & Analytics",
        "body": "Our platform uses secure cookies and analytics tools to enhance user experience, remember your preferences, and analyze traffic patterns across our web application."
      },
      {
        "title": "6. Your Privacy Rights",
        "body": "You retain the right to access, update, or request the deletion of your account information by reaching out directly to our administrative and support team."
      }
    ],
    "updated_at": null
  },
  "refund-policy": {
    "slug": "refund-policy",
    "title": "Refund Policy",
    "description": "Review our refund, cancellation, and return guidelines before making a payment.",
    "sections": [
      {
        "title": "1. Eligibility for Refunds",
        "body": "Refund requests are evaluated based on subscription plans, merchant membership tiers, and specific e-commerce transaction guidelines managed within the platform."
      },
      {
        "title": "2. Subscription & Membership Fees",
        "body": "Active merchant membership plans or promotional service fees are generally non-refundable once activated, except under special administrative review or billing discrepancies."
      },
      {
        "title": "3. Processing Timeline",
        "body": "Approved refunds are processed through secure banking channels or original payment methods within 5-7 business days, depending on your financial institution."
      },
      {
        "title": "4. E-Commerce & Product Returns",
        "body": "Product purchases made across the platform follow individual vendor return policies, requiring items to be unused and in original packaging for valid claims."
      },
      {
        "title": "5. Dispute Resolution",
        "body": "If you encounter any discrepancies regarding billing, reward point redemptions, or campaign fees, our support team investigates and resolves issues promptly."
      },
      {
        "title": "6. Requesting Support",
        "body": "To initiate a refund or billing inquiry, please reach out directly through our contact page with your registered merchant details and transaction reference numbers."
      }
    ],
    "updated_at": null
  },
  "merchant-agreement": {
    "slug": "merchant-agreement",
    "title": "Merchant Agreement",
    "description": "Review the terms, responsibilities, and operational guidelines governing your merchant partnership.",
    "sections": [
      {
        "title": "1. Partnership Scope & Onboarding",
        "body": "By registering as a merchant partner, you agree to participate in our digital ecosystem, utilizing merchant dashboards, QR campaign features, and promotional tools provided by the platform."
      },
      {
        "title": "2. Merchant Responsibilities",
        "body": "Merchants are required to maintain accurate business profiles, provide verified retail category details, and honor valid e-commerce orders, reward point redemptions, and promotional discounts."
      },
      {
        "title": "3. Benefits & Rewards Structure",
        "body": "Merchant benefits, commercial discounts, and referral incentives are assigned dynamically based on membership level, active participation, and administrative configurations."
      },
      {
        "title": "4. QR Code & Campaign Terms",
        "body": "Promotional scratch cards, lucky number contests, and campaign QR assets deployed at merchant locations must be utilized in accordance with platform guidelines and promotional terms."
      },
      {
        "title": "5. Account Security & Compliance",
        "body": "Partners must ensure secure handling of login credentials and dashboard data. Unauthorized use, fraudulent activities, or policy violations may result in suspension or termination of partnership."
      },
      {
        "title": "6. Agreement Modifications",
        "body": "We reserve the right to update or modify these merchant agreement terms as the ecosystem evolves. Continued participation on the platform signifies ongoing acceptance of updated terms."
      }
    ],
    "updated_at": null
  },
  "customer-agreement": {
    "slug": "customer-agreement",
    "title": "Customer Agreement",
    "description": "This Customer Agreement outlines your rights and responsibilities when using our platform:",
    "sections": [
      {
        "title": "1. Data Privacy",
        "body": "We only collect information necessary to track your rewards and ensure fair participation. Your data is not sold to third parties."
      },
      {
        "title": "2. Communication",
        "body": "By participating, you agree to receive transactional notifications regarding your rewards and redemptions."
      },
      {
        "title": "3. Fair Usage",
        "body": "You agree to use the platform fairly and respect merchant rules when claiming physical or digital goods in-store."
      },
      {
        "title": "4. Accountability",
        "body": "Any fraudulent activity, including the use of automated bots or duplicate accounts, violates this agreement."
      },
      {
        "title": "5. Updates",
        "body": "This agreement may be updated periodically to reflect new features and legal requirements."
      }
    ],
    "updated_at": null
  }
}
