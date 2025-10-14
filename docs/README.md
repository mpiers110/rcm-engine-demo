# ClaimCheck Pro: System Architecture & Workflow Guide

## 1. System Overview

ClaimCheck Pro is a full-stack web application designed to automate the adjudication of insurance claims. It provides a complete, end-to-end solution for uploading claims and rule documents, running them through a sophisticated validation pipeline, and visualizing the results.

The system is architected around three core principles:
1.  **Configurability**: Business rules (both medical and technical) are not hardcoded. They are dynamically parsed from uploaded PDF documents, allowing administrators to modify complex logic without any code changes.
2.  **Persistence**: All data—users, claims, rules, and audit logs—is stored in a central PostgreSQL database, ensuring data integrity and providing a single source of truth.
3.  **Dual Validation Engine**: The system offers two modes of validation: a high-speed, deterministic **Static Rule Engine** for clear pass/fail checks, and a powerful **LLM-based Engine** for generating nuanced, human-readable explanations and corrective action recommendations.

---

## 2. System Architecture

The application is composed of three primary layers: a Next.js Frontend, a Next.js API Backend, and a Data Pipeline orchestrated by the backend.

![Architecture Diagram](https://storage.googleapis.com/stabl-agent-artefacts/claimcheck-pro-architecture.png)

### Frontend
- **Framework**: Next.js 14 with React (App Router)
- **UI Components**: ShadCN UI for professional, pre-built components.
- **Styling**: Tailwind CSS.
- **Functionality**: Secure user login, file uploading, and dynamic visualization of results through charts and tables.

### Backend
- **Framework**: Next.js API Routes.
- **Database**: PostgreSQL.
- **ORM**: Prisma for type-safe database access.
- **Authentication**: NextAuth.js for handling user sessions and authentication.
- **AI/LLM**: Genkit with the Gemini model for intelligent explanation and recommendation generation.

### Data & CI/CD
- **Data Pipeline**: A series of orchestrated jobs for parsing, validating, and enriching data.
- **Testing**: Jest for unit testing the core validation logic.
- **CI/CD**: GitHub Actions for automated building, testing, and deployment to Vercel.

---

## 3. End-to-End Workflow

The application workflow can be broken down into three main phases: **Authentication**, **Data Ingestion**, and **Validation & Visualization**.

### Phase 1: Authentication

1.  **Login Screen**: The user is first presented with a secure login screen at `/login`.
2.  **Credentials Check**: The user enters their username and password. On submission, the data is sent to the NextAuth.js API endpoint (`/api/auth/[...nextauth]`).
3.  **Database Verification**: The API hashes the provided password and compares it against the stored hash in the `User` table of the database.
4.  **Session Creation**: On a successful match, NextAuth.js creates a secure, encrypted session for the user, who is then redirected to the main dashboard. All subsequent API requests from the user will include this session token, ensuring they can only access their own data.

### Phase 2: Data Ingestion & Persistence

This phase involves loading the necessary data into the system via the UI.

1.  **Upload Claims**: The user uploads an Excel file containing claim records.
    -   The file is sent to the `/api/ingest` endpoint.
    -   The backend uses the `xlsx` library to parse the file into a standardized JSON format.
    -   The parsed claims are saved to the `Claim` table in the database, linked to the current user's `ownerId`. The initial `status` is set to "Pending".

2.  **Upload Rule Documents**: The user uploads the Medical and Technical Adjudication Guides as PDF files.
    -   **Medical Rules PDF**: Sent to `/api/rules/medical`. The backend uses a custom parser (`pdf-parser.ts`) to extract the structured rules (e.g., encounter rules, facility rules). A new `MedicalRuleSet` is created in the database and marked as `isActive`.
    -   **Technical Rules PDF**: Sent to `/api/rules/technical`. The backend uses `technical-parser.ts` to extract approval requirements, thresholds, and ID formatting rules. A new `TechnicalRuleSet` is created and marked as `isActive`.

At the end of this phase, all claims and the active rule sets are persisted in the database and associated with the user.

### Phase 3: Validation, Persistence, and Visualization

This is the core adjudication pipeline, triggered by the user from the dashboard.

1.  **User Action**: The user clicks either **"Validate with Rules"** or **"Validate with LLM"**.
2.  **Trigger Backend Pipeline**: The frontend sends a `POST` request to the `/api/validate` endpoint, specifying the chosen `mode` (`rules` or `llm`).
3.  **Fetch Data from DB**: The backend API receives the request and:
    -   Identifies the user via their session.
    -   Fetches all claims for that user from the `Claim` table.
    -   Fetches the `isActive` Medical and Technical rule sets for that user from the database.
4.  **Execute Validation Pipeline**:
    -   **If `mode` is `rules`**:
        -   The `staticValidateClaims` function is executed. It runs each claim through the deterministic rule engine, checking against all medical and technical rules.
        -   The function generates a precise list of errors for each failed claim.
    -   **If `mode` is `llm`**:
        -   The `validateClaimLLM` flow is executed for each claim. The LLM is provided with the raw text of the rule documents and the claim data, and it returns whether the claim is valid and a list of detected errors.
        -   For any claim with errors (from either pipeline), a second LLM flow (`explainAndRecommendAction`) is called. This AI-powered function generates a human-friendly explanation of the errors and a succinct, actionable recommendation for correction.
5.  **Persist Results to Master Table**:
    -   After validation is complete, the API iterates through the processed claims.
    -   It uses Prisma's `update` function to save the results—`status`, `error_type`, `error_explanation`, and `recommended_action`—back into the corresponding records in the master `Claim` table.
6.  **Return Data and Visualize**:
    -   The fully processed claims data is returned to the frontend as a JSON response.
    -   The frontend dynamically updates the UI:
        -   The **Charts** (`ChartsView`) are re-rendered to show the new breakdown of validated vs. non-validated claims by count and paid amount.
        -   The **Results Table** (`ClaimsTable`) is populated with the detailed, row-by-row adjudication results, including the rich explanations and recommendations in tooltips.

---

## 4. Supporting Systems

-   **Audit Log**: The `/api/audit` endpoint, backed by the `AuditLog` table, provides a real-time stream of all major system events. The `addToAuditLog` function is called across the backend to ensure a persistent, user-specific record of all actions is maintained.
-   **Health Check**: The `/api/health` endpoint is a simple, public endpoint that returns a `200 OK` status if the server is running. This is used by external services (like Vercel) for uptime monitoring.
-   **CI/CD Pipeline**: The `.github/workflows/deploy.yml` file configures a GitHub Actions pipeline. On every push to the `main` branch, it automatically builds the application, runs the Jest unit tests, and, if they pass, deploys the new version to Vercel, ensuring continuous quality and integration.
