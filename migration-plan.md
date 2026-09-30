# React Migration Feasibility Report

This report evaluates the feasibility of rebuilding the "Audit Report Generator & Dispatcher" as a standalone React app (Path A) or as a new feature within the existing `team-allocation-calendar` React app (Path B).

## 1. Feature Inventory & Feasibility

| Feature | Current Implementation | React-side Approach | Verdict & Risk |
| :--- | :--- | :--- | :--- |
| **Excel Parsing & Data Extraction** | Python `pandas`. Loads entire `.xlsx` into RAM. | `SheetJS` or `exceljs`. Parses files entirely in the browser. | **Easy.** Very standard in React. |
| **Excel Template Population** | Python `openpyxl`. Writes data to cells, forces recalculation, sets strict print areas. | `exceljs` can write to cells and preserve most styling. However, forcing formula evaluation client-side is tricky. | **Moderate.** Risk of losing complex formula caches. |
| **Excel to PDF Conversion** | Headless `LibreOffice` via PyUNO. Perfect print layout fidelity. | Cannot be done accurately in the browser. `jsPDF` or `pdfmake` require rebuilding the layout from scratch in code. | **Not Feasible client-side.** *Requires* a backend or external API. |
| **PDF Extraction & Merging** | `PyMuPDF` (`fitz`) and `pypdf`. Slices observation pages and merges with Annexure. | `pdf-lib` can slice, merge, and manipulate PDFs purely in the browser. | **Easy.** Works well in modern browsers. |
| **PDF Compression** | `PyMuPDF` aggressively downsamples images >150DPI and deflates streams. | Very memory-intensive in JS. Requires extracting images, drawing to HTML `<canvas>`, and replacing them. | **Hard.** Risk of browser tab crashing on large files. |
| **Gmail Auth & Drafting** | Flask OAuth server + `google-api-python-client`. | Google Identity Services (GIS) for client-side implicit OAuth and REST calls to Gmail API. | **Easy.** Standard OAuth flow. |

## 2. LibreOffice Dependency Analysis
The current app relies on LibreOffice (`soffice`) for one critical task: **High-fidelity Excel-to-PDF conversion**. 
Because the Excel templates rely on native print boundaries (`fitToWidth`), LibreOffice is *truly required* to generate a visually identical PDF.
*   **Can it run in the browser?** No. WebAssembly ports of office suites are experimental, massive (>100MB), and unstable.
*   **Can it run on Supabase (Target App Backend)?** No. Supabase Edge Functions (Deno) have strict size limits and cannot run a massive binary like LibreOffice.
*   **The Cheapest Replacement:** If fidelity must be kept, host a lightweight **Gotenberg** Docker container (a stateless API wrapper around LibreOffice) on an on-demand service like Google Cloud Run or AWS App Runner. It scales to zero, meaning you only pay pennies when a user actually converts a file.

## 3. Path A vs. Path B Comparison

| Metric | Path A: Standalone React App | Path B: Feature in `team-allocation-calendar` |
| :--- | :--- | :--- |
| **Architecture** | Vite + React (Client-only) + Gotenberg API | React Router module + Gotenberg API |
| **Dev Effort** | ~3-4 weeks (Need to build routing, UI, auth from scratch) | ~2 weeks (Leverage existing shadcn UI, Tailwind, Zustand) |
| **Hosting & Cost** | Vercel/Netlify (Free) + Cloud Run API ($1/mo) | Already hosted + Cloud Run API ($1/mo) |
| **Drop Oracle VM?** | **Yes.** Drops the heavy VM entirely. | **Yes.** Drops the heavy VM entirely. |
| **Concurrency** | Infinite. Files processed locally in RAM. API handles conversion. | Infinite. Files processed locally in RAM. |
| **Security & Privacy** | Files never leave the browser (except for the PDF conversion API). | Same. Inherits Supabase RBAC for route protection. |
| **Maintenance** | Two separate codebases to maintain. | One unified portal for internal tools. |

## 4. Final Recommendation
**Recommendation: Path B (Hybrid Approach)**
I highly recommend adding this as a feature to your existing `team-allocation-calendar` app rather than starting from scratch. You already have a modern, robust foundation (React 19, Vite, Tailwind, shadcn/ui, Supabase Auth/RBAC) that will dramatically speed up UI development.

**However, it cannot be 100% client-side.** Because LibreOffice is strictly required to preserve your Excel layouts, you must deploy a serverless PDF conversion API (like Gotenberg). The React app will handle 90% of the work (parsing, populating Excel, zipping, emailing) in the browser, and only send the populated Excel file to the API to get a PDF back. 

## 5. Phased Migration Plan
1.  **Phase 1: Conversion API (Backend)**
    *   Deploy a serverless Gotenberg container (or similar LibreOffice API) to Google Cloud Run or AWS App Runner to handle the Excel-to-PDF bottleneck.
2.  **Phase 2: UI & Client-side Logic (Frontend)**
    *   Create a new route in `team-allocation-calendar` protected by Supabase RBAC.
    *   Build the multi-step form using `react-hook-form` and `shadcn/ui`.
    *   Implement client-side Excel parsing (`exceljs`) and PDF merging (`pdf-lib`).
3.  **Phase 3: Integration & Email**
    *   Connect the frontend to the new PDF Conversion API.
    *   Implement Google GIS for client-side Gmail authentication and draft creation.

## 6. Open Questions & Risks
*   **Compression Risk:** Can we accept larger final PDF sizes? Doing aggressive image downsampling purely in the browser might crash low-end devices. 
*   **Template Rewrite:** Are you open to converting the `.xlsx` templates to HTML/CSS? If yes, we could drop the LibreOffice requirement entirely and generate PDFs purely in the browser using `html2pdf.js`. 
*   **Supabase Auth vs Google Auth:** The target app uses Supabase for login, but this feature requires Google OAuth to send Gmails. Is it acceptable to prompt users to "Connect Gmail" as a secondary authentication step within the app?
