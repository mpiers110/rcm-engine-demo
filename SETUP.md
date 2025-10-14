# ClaimCheck Pro: Setup & Demo Guide

This document provides instructions for setting up the project and a script for a 5-minute video demonstration.

---

## 1. Project Setup & Deployment

Follow these steps to get the application running.

### Prerequisites
*   Node.js (v20 or later)
*   A GitHub account
*   A Vercel account (connected to your GitHub)
*   A free PostgreSQL database (e.g., from Neon, Supabase, or Vercel Postgres)

### Step 1: Clone & Install
Clone the repository to your local machine and install the dependencies.
```bash
git clone <your-repo-url>
cd <your-repo-directory>
npm install
```

### Step 2: Configure Environment
1.  Create a new file named `.env` in the root of the project.
2.  Get the connection string for your PostgreSQL database.
3.  Add the connection string to your `.env` file:
    ```
    DATABASE_URL="postgresql://user:password@host:port/database"
    ```

### Step 3: Sync Database Schema
Run the Prisma command to create the necessary tables in your database based on the schema.
```bash
npx prisma db push
```

### Step 4: Run Locally (Optional)
To test the application locally, run:
```bash
npm run dev
```
The application will be available at `http://localhost:9002`.

### Step 5: Deploy to Vercel
1.  Push your code to your GitHub repository.
2.  On the Vercel dashboard, click **"Add New... > Project"**.
3.  Import the project from your GitHub repository. Vercel will automatically detect it as a Next.js application.
4.  Before deploying, navigate to the **"Environment Variables"** section in the Vercel project settings.
5.  Add your `DATABASE_URL` as an environment variable.
6.  Click **"Deploy"**. Vercel will build and deploy your application. Subsequent pushes to the `main` branch will automatically trigger new deployments.

---

## 2. Video Demo Walkthrough (5-Minute Script)

This script will guide you through a demonstration of the application's key features.

**(0:00 - 0:30) Introduction & Login**
*   **Action:** Show the main login screen.
*   **Script:** "Welcome to ClaimCheck Pro, a full-stack AI-powered validation engine for medical claims. The system provides a secure, multi-tenant environment to upload claims and rule documents, run them through a sophisticated validation pipeline, and visualize the results. Let's log in with the admin credentials to access the dashboard."
*   **Action:** Enter `admin` and `password`, then click "Login".

**(0:30 - 1:30) Data & Rules Ingestion**
*   **Action:** Show the main dashboard with the three upload cards.
*   **Script:** "The dashboard is the central hub. The first step is to load our data. The system requires three files: the claims data in Excel format, and the Medical and Technical adjudication rules as PDF documents. Let's upload them one by one."
*   **Action:**
    1.  Upload the `Claims.xlsx` file. A toast notification confirms success.
    2.  Upload the `Medical Rules.pdf` file. A toast appears.
    3.  Upload the `Technical Rules.pdf` file. Another toast appears.
*   **Script:** "As each file is uploaded, the backend API parses it, validates its structure, and persists the data to our master tables in the database, associating it with the current user. Now that all our data is loaded, the validation buttons are enabled."

**(1:30 - 2:45) Static Rule & LLM Validation**
*   **Action:** First, click the "Validate with Rules" button. Wait for the results to load.
*   **Script:** "Now, let's run the static rule-based validation. When I click this button, the backend triggers a pipeline that fetches all the user's claims and active rules from the database. It runs each claim through our deterministic engine, which applies dozens of medical and technical checks. The results, including errors and statuses, are then saved back to the database."
*   **Action:** After results appear, click the "Validate with LLM" button.
*   **Script:** "Next, we can use the AI-powered pipeline. This process also fetches the data from the database, but instead of using our static engine, it sends the raw rule text and claim data to a Large Language Model. The LLM validates the claim and, for any errors, generates a nuanced, human-readable explanation and a targeted recommendation for corrective action. These rich results are then also persisted to the database."

**(2:45 - 4:15) Analyzing the Results**
*   **Action:** Show the "Overview" tab with the two charts.
*   **Script:** "Once validation is complete, the results are displayed. The 'Overview' tab gives us a high-level summary with two key charts: one showing the breakdown of claim counts by error category, and another showing the total paid amount for each category. This helps us quickly identify the financial impact of different error types."
*   **Action:** Switch to the "Details" tab and scroll through the results table.
*   **Script:** "The 'Details' tab provides a row-by-row breakdown. Here we can see the `Status` and `Error Type` for each claim. More importantly, we have the AI-generated `Explanation` and `Recommended Action`."
*   **Action:** Hover over an "Explanation" cell to show the tooltip.
*   **Script:** "This tooltip is powerful. It not only gives the clear, AI-generated explanation but also lists the exact, specific rule violations that the static engine detected. This gives adjudicators both a quick summary and the precise technical details they need for correction."

**(4:15 - 5:00) Audit & Conclusion**
*   **Action:** Click on the "Audit Log" button to open the side sheet. Scroll through it.
*   **Script:** "Finally, the entire process is logged. The Audit Log provides a real-time, persistent record of every major action taken in the system, from file ingestion to validation runs, ensuring full traceability."
*   **Action:** Close the sheet and return to the main dashboard.
*   **Script:** "In summary, ClaimCheck Pro provides a complete, secure, and configurable end-to-end solution for claims adjudication, seamlessly blending deterministic rule-based validation with the power of generative AI for intelligent feedback. Thank you."
