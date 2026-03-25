# AI Empowerment Group — Flow Diagrams

---

## 1. Site Navigation Flow

```mermaid
graph TD
    A([🌐 aiempowermentgroup.com]) --> B[Homepage /]

    B --> C[Bio /bio]
    B --> D[Services /services]
    B --> E[Case Studies /case-studies]
    B --> F[Testimonials /testimonials]
    B --> G[Contact /contact]
    B --> H[Login /login]

    %% Footer links
    B -.->|Footer| I[Accessibility Statement /accessibility]
    C -.->|Footer| I
    D -.->|Footer| I

    %% CTAs always route to contact
    C -->|Schedule a Consultation CTA| G
    D -->|Schedule a Consultation CTA| G
    E -->|Schedule a Consultation CTA| G
    F -->|Schedule a Consultation CTA| G

    %% Login routes
    H -->|Authenticated| J[Client Portal /portal]
    H -->|Not Authenticated| H

    style A fill:#C9A84C,color:#2D2D2D
    style J fill:#2D2D2D,color:#C9A84C,stroke:#C9A84C
```

---

## 2. User Journey — New Visitor (Lead Conversion)

```mermaid
flowchart LR
    A([Visitor Lands]) --> B{Entry Point}

    B -->|Google Search| C[Homepage]
    B -->|LinkedIn / Referral| D[Bio Page]
    B -->|Direct Service Search| E[Services Page]

    C --> F[Reads Hero + Services Preview]
    F --> G[Clicks 'Learn More']
    G --> E

    D --> H[Reads Authority Bio]
    H --> I{Convinced?}
    I -->|Yes| G2[Clicks 'Work With Me']
    I -->|No| E

    E --> J[Reads Service Detail]
    J --> K[Views Case Studies]
    K --> L[Reads Testimonials]
    L --> M[Clicks 'Schedule a Consultation']
    G2 --> M

    M --> N[Contact Form /contact]
    N --> O[Fills: Name, Country, Inquiry Type, Message]
    O --> P{Form Valid?}
    P -->|Error| Q[Inline Error State Shown]
    Q --> O
    P -->|Success| R[Success Confirmation Message]
    R --> S([Lead Captured ✓])

    style S fill:#C9A84C,color:#2D2D2D
    style Q fill:#cc3333,color:#fff
```

---

## 3. User Journey — Returning Client (Login Flow — Phase 2)

```mermaid
flowchart TD
    A([Returning Client]) --> B[Navigates to /login]

    B --> C{Authentication Method}
    C -->|Email + Password| D[Firebase Email Auth]
    C -->|Google Sign-In| E[Firebase Google OAuth]

    D --> F{Valid Credentials?}
    E --> F

    F -->|No| G[Error: Invalid credentials shown]
    G --> B

    F -->|Yes — First Login| H[Email Verification Check]
    H -->|Not Verified| I[Resend Verification Email]
    I --> B
    H -->|Verified| J[Session Token Issued]

    F -->|Yes — Returning| J

    J --> K[Redirect to /portal]
    K --> L{Portal Features}

    L --> M[View Deliverables]
    L --> N[Download Reports]
    L --> O[View Project Timeline]
    L --> P[Message Consultant]

    P --> Q[Contact /contact with pre-filled client ID]

    style K fill:#2D2D2D,color:#C9A84C,stroke:#C9A84C
    style G fill:#cc3333,color:#fff
    style I fill:#cc8800,color:#fff
```

---

## 4. Contact Form Logic Flow

```mermaid
flowchart TD
    A[User Opens /contact] --> B[Tab to: Full Name field]
    B --> C[Tab to: Email field]
    C --> D[Tab to: Country dropdown]
    D --> E[Tab to: Nature of Inquiry selector]
    E --> F[Tab to: Message textarea]
    F --> G[Tab to: Submit button]

    G --> H{Client-Side Validation}
    H -->|Missing required fields| I[Highlight field + ARIA error message]
    I --> B

    H -->|All valid| J[Send to Firebase Function]
    J --> K{Server Response}

    K -->|200 OK| L[Show: success banner — We will be in touch within 24 hours]
    K -->|500 Error| M[Show: error banner — Please try again or email directly]

    L --> N([Form Cleared / Lead Logged])
    M --> G

    style L fill:#2D7D32,color:#fff
    style M fill:#cc3333,color:#fff
    style I fill:#cc8800,color:#fff
```

---

## 6. Stripe Payment Flow

```mermaid
flowchart TD
    A([User on /services or /portal]) --> B[Clicks 'Buy Training' button]

    B --> C[BuyButton calls Firebase Function\ncreateCheckoutSession]
    C --> D{User logged in?}

    D -->|No| E[Redirect to /login first]
    E --> B

    D -->|Yes| F[Stripe API: Create Checkout Session]
    F --> G[Return Stripe-hosted URL]
    G --> H[Browser redirects to Stripe Checkout page]

    H --> I{User action on Stripe}
    I -->|Cancels| J[Redirect to /payment-cancelled]
    I -->|Pays| K[Stripe processes payment]

    K --> L[Stripe fires webhook → stripeWebhook Function]
    L --> M{Verify webhook signature}

    M -->|Invalid signature| N[Reject — possible attack]
    M -->|Valid| O[Extract firebaseUID from session metadata]

    O --> P[Update Firestore:\nusers/uid → membershipStatus: paid]
    P --> Q[Redirect to /payment-success]
    Q --> R[User navigates to /portal]
    R --> S([Portal unlocked for paid member ✓])

    style S fill:#C9A84C,color:#2D2D2D
    style N fill:#cc3333,color:#fff
    style J fill:#cc8800,color:#fff
    style P fill:#2D7D32,color:#fff
```

---

## 7. Membership Access Control

```mermaid
flowchart TD
    A([User visits /portal]) --> B{Authenticated?}

    B -->|No| C[Redirect to /login]
    C --> D[Login with Email or Google]
    D --> B

    B -->|Yes| E{Check Firestore\nmembershipStatus}

    E -->|"paid"| F[Render /portal page]
    F --> G[Messaging Channel\nwith Consultant]

    E -->|"inactive"| H[Show: Subscription lapsed page\nSubscription cancelled or payment failed]
    H --> I[Clicks 'Reactivate — $750/week']
    I --> J[Stripe Payment Flow]
    J -->|Success| E

    E -->|missing / new user| K[Portal does not exist for this user\nRedirect to /services]
    K --> L[Clicks 'Get Started — $750/week']
    L --> J

    style F fill:#2D2D2D,color:#C9A84C,stroke:#C9A84C
    style H fill:#cc3333,color:#fff
    style K fill:#6B6B6B,color:#fff
```

---

## 5. Firebase Deploy Pipeline

```mermaid
flowchart LR
    A([Developer Edits Code]) --> B[npm run build]
    B --> C{Build Passes?}
    C -->|No| D[Fix Errors]
    D --> B
    C -->|Yes| E[firebase hosting:channel:deploy preview]
    E --> F[Preview URL Generated]
    F --> G{QA Review}
    G -->|Fail| D
    G -->|Pass| H[firebase deploy --only hosting]
    H --> I([Live: aiempowermentgroup.com ✓])

    style I fill:#C9A84C,color:#2D2D2D
    style D fill:#cc3333,color:#fff
```
