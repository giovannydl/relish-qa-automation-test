# QA Automation Engineer Technical Test

This repository contains the complete solution to the QA Automation Engineer 
Technical Test, covering bug discovery, unit testing, code coverage, test case 
documentation, and end-to-end browser automation.

---

## Table of Contents

1. [Repository Structure](#repository-structure)
2. [Part 1 — Bug Discovery and Fixes](#part-1--bug-discovery-and-fixes)
3. [Part 2 — Code Coverage](#part-2--code-coverage)
4. [Part 3 — Test Case Documentation](#part-3--test-case-documentation)
5. [Part 4 — Automation Framework](#part-4--automation-framework)
6. [How to Run](#how-to-run)
7. [Tools Used](#tools-used)
8. [AI Tool Disclosure](#ai-tool-disclosure)

---

## Repository Structure

```
/
├── order-processor.js            # Original file (unmodified, as provided)
├── order-processor-fixed.js      # Fixed version with all bugs corrected
├── BUG-REPORT.md                 # Detailed bug report (Part 1.1)
├── COVERAGE-REPORT.md            # Code coverage analysis (Part 2)
├── TEST-CASES.md                 # UI test case documentation (Part 3 & 4)
├── package.json                  # Dependencies and scripts
├── playwright.config.ts          # Playwright configuration
│
├── tests/
│   └── order-processor.test.js   # Jest unit test suite — 68 tests (Part 1.2)
│
└── automation/
    ├── pages/                    # Page Object Models (Part 4)
    │   ├── BasePage.ts           # Abstract base class for all POMs
    │   ├── AjaxPage.ts           # Scenario A — AJAX Data page
    │   ├── SampleAppPage.ts      # Scenario B — Sample App page
    │   ├── DynamicIdPage.ts      # Scenario C — Dynamic ID page
    │   └── OverlappedPage.ts     # Scenario C — Overlapped Element page
    └── tests/                    # Playwright spec files (Part 4)
        ├── scenarioA.spec.ts     # AJAX waiting tests
        ├── scenarioB.spec.ts     # Login / logout interaction tests
        └── scenarioC.spec.ts     # Dynamic ID and overlapped element tests
```

---

## Part 1 — Bug Discovery and Fixes

### Bugs Found (6 total)

| # | Method | Severity | Description |
|---|--------|----------|-------------|
| 1 | `getTotalItemCount()` | 🔴 Critical | Off-by-one loop `<=` crashes with TypeError on every call |
| 2 | `calculateTotal()` | 🟠 Major | Coupon does not reduce the tax base — tax overcharged |
| 3 | `calculateTotal()` | 🟠 Major | Coupon can produce a negative total — no floor/clamp |
| 4 | `addLineItem()` | 🟠 Major | Allows duplicate SKUs — corrupts `removeLineItem` and `updateQuantity` |
| 5 | `removeLineItem()` | 🟡 Minor | Returns `undefined` instead of `false` for non-existent SKU |
| 6 | `calculateTotal()` | 🟡 Minor | `rushSurcharge` not rounded consistently with other monetary fields |

See **[BUG-REPORT.md](./BUG-REPORT.md)** for the full report including reproduction
steps, root cause analysis, and fixes for each bug.

### Files

- `order-processor.js` — original, unmodified.
- `order-processor.fixed.js` — corrected version with all 6 bugs fixed and annotated

---

## Part 2 — Code Coverage

Coverage measured with **Jest's built-in Istanbul** instrumentation.

### Results — `order-processor.fixed.js`

| Metric     | Coverage |
|------------|----------|
| Statements | **100%** |
| Branches   | **100%** |
| Functions  | **100%** |
| Lines      | **100%** |

All 4 metrics exceed the required 95% threshold.

See **[COVERAGE-REPORT.md](./COVERAGE-REPORT.md)** for the full analysis including
branch-by-branch breakdown and explanation of why the original file shows lower coverage.

```bash
npm run test:coverage
```

---

## Part 3 — Test Case Documentation

**[TEST-CASES.md](./TEST-CASES.md)** contains 11 documented test cases across 3 scenarios:

| Scenario | Focus | Test Cases |
|----------|-------|------------|
| A — AJAX | Dynamic waiting, explicit waits vs hardcoded sleep | TC-A-01 to TC-A-03 |
| B — Sample App | Form interactions, dynamic text, button state | TC-B-01 to TC-B-04 |
| C — Tricky Selectors | Dynamic IDs, overlapped elements, scroll | TC-C-01 to TC-C-04 |

Each test case includes: ID, description, preconditions, steps, test data,
expected result, actual result, pass/fail status, and implementation notes.

---

## Part 4 — Automation Framework

### Why Playwright + TypeScript

**Playwright** was chosen over Selenium, Cypress, and Puppeteer for these reasons:

1. **Built-in auto-waiting** — Playwright's locators wait for elements to be
   actionable before interacting. This removes entire categories of flakiness
   without extra `waitFor` boilerplate in every test.

2. **`waitFor({ state: 'visible' })`** — The AJAX scenario requires waiting up to
   20 seconds for a dynamically-injected element. Playwright's explicit wait API
   is clean, condition-based, and does not require polling loops or custom expected
   conditions.

3. **`scrollIntoViewIfNeeded()`** — A first-class method for the overlapped element
   scenario. It only scrolls when needed and correctly accounts for sticky headers,
   something that requires raw JS injection in Selenium.

4. **Speed** — Playwright runs tests in parallel across isolated browser contexts
   by default, with no extra configuration.

**Tradeoff considered:** Cypress has a friendlier debugging experience (time-travel
debugger) but is limited to Chromium-based browsers in its open-source tier and
does not support multiple browser contexts in a single test. Playwright has no such limitation.

---

### Selector Strategy

#### Scenario A — AJAX Page

| Element | Selector Used | Type | Reasoning |
|---------|--------------|------|-----------|
| Trigger button | `#ajaxButton` | ID | Stable, does not regenerate on reload. |
| Result label | `.bg-success` | CSS class | Applied to the element only after AJAX response.  |

---

#### Scenario B — Sample App

| Element | Selector Used | Type | Reasoning |
|---------|--------------|------|-----------|
| Username input | `[name="UserName"]` | Attribute | `name` attributes are semantically meaningful and stable |
| Password input | `[name="Password"]` | Attribute | Same reasoning as username. |
| Login/Logout button | `#login` | ID | Stable ID present in source. Does not regenerate. |
| Status label | `#loginstatus` | ID | Stable ID, directly identifies the assertion target. |


---

#### Scenario C — Dynamic ID Page

| Element | Selector Used | Type | Reasoning |
|---------|--------------|------|-----------|
| Dynamic button | `button.btn-primary` | CSS class | The `id` regenerates on every load.. |

---

#### Scenario C — Overlapped Element Page

| Element | Selector Used | Type | Reasoning |
|---------|--------------|------|-----------|
| Name input | `#id` | ID | Stable ID in source |

**Scroll strategy — `scrollIntoViewIfNeeded()` vs alternatives:**

| Method | Behavior | Verdict |
|--------|----------|---------|
| `locator.scrollIntoViewIfNeeded()` | Scrolls only if needed| Used |
| `element.scrollIntoView()` via JS | Always scrolls, doesn't account for fixed headers | Acceptable fallback |
| `page.evaluate(() => element.scrollIntoView())` | Raw JS injection | Verbose, less readable |
| Selenium `Actions.moveToElement()` | Moves mouse to element | Less precise on small viewports |

---

### Page Object Model Design

All page objects extend `BasePage`, which holds the `page` reference and provides
`navigate()` and `getHeading()`. Each page object:

- Declares all locators as `readonly` properties 
- Exposes named action methods (`clickTriggerButton()`, `login()`, `logout()`)
- Exposes named query methods (`getStatusText()`, `getButtonText()`)
- Contains zero `expect()` / assertion calls.

---

## How to Run

### Prerequisites

- Node.js v18 or higher
- npm v8 or higher

### Installation

Clone the repository
```bash
git clone <https://github.com/giovannydl/relish-qa-automation-test>
cd <relish-qa-automation-test>
```

Install all dependencies (Jest + Playwright + TypeScript)
```bash
npm install
```

Install Playwright browsers (one-time setup)
```bash
npx playwright install chromium
```

### Unit Tests 

Run all 68 Jest unit tests
```bash
npm test
```

Run with code coverage report
```bash
npm run test:coverage
```

### Automation Tests

Run all Playwright E2E tests (headless)
```bash
npm run test:e2e
```

Run with browser visible — useful for debugging
```bash
npm run test:e2e:headed
```

Run a specific scenario
```bash
npm run test:e2e:scenarioA    # AJAX waiting
npm run test:e2e:scenarioB    # Login / logout
npm run test:e2e:scenarioC    # Dynamic ID and overlapped element
```

Open interactive Playwright UI mode
```bash
npm run test:e2e:ui
```

View HTML report from last run
```bash
npm run test:e2e:report
```

---

## Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | v18+ | Runtime |
| **Jest** | ^30.3.0 | Unit testing framework (Part 1 & 2) |
| **Playwright** | ^1.52.0 | Browser automation framework (Part 4) |
| **ts-node** | ^10.9.2 | TypeScript execution for Playwright config |
| **Istanbul** | built-in Jest | Code coverage instrumentation (Part 2) |

---

## AI Tool Disclosure

**AI assistant used:** Claude (Anthropic) — claude.ai

**Parts assisted:**

- **Part 1.1 (Bug Discovery):** The initial static analysis was performed manually;
  Claude helped structure the bug report and articulate root causes clearly.

- **Part 1.2 (Fixes & Unit Tests):** Claude assisted in reviewing and adding more tests
  to the Jest test suite. 

- **Part 2 (Coverage):** Claude assisted in writing the coverage report document.

- **Part 3 (Test Case Documentation):** Claude assisted in structuring the test cases
  according the provided scenarios and the required format. 

- **Part 4 (Automation Framework):** Claude assisted in generating selector strategies,
  wait approaches, and document architectural decisions.

All code was reviewed, understood, and validated before inclusion in this repository.
The git history reflects the actual development process with incremental commits.
