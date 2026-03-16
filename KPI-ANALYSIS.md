# KPI Analysis — Nightly Regression Suite

**Suite size:** 200 tests (196 active, 4 permanently skipped)  
**Period:** 2 weeks (Mon W1 → Fri W2), 10 nightly runs  
**Author:** Giovanny De León  
**Role:** Senior QA Engineer  

---

## Raw Data with Calculated Metrics

| Night  | Total | Passed | Failed | Skipped | Pass Rate | Fail Rate | Duration | Pass Rate Δ |
|--------|-------|--------|--------|---------|-----------|-----------|----------|-------------|
| Mon W1 | 200   | 178    | 18     | 4       | 90.82%    | 9.18%     | 12m 30s  | —           |
| Tue W1 | 200   | 180    | 16     | 4       | 91.84%    | 8.16%     | 12m 45s  | **+1.02pp** |
| Wed W1 | 200   | 165    | 31     | 4       | 84.18%    | 15.82%    | 14m 10s  | **−7.65pp** |
| Thu W1 | 200   | 170    | 26     | 4       | 86.73%    | 13.27%    | 13m 55s  | +2.55pp     |
| Fri W1 | 200   | 182    | 14     | 4       | 92.86%    | 7.14%     | 12m 20s  | +6.12pp     |
| Mon W2 | 200   | 175    | 21     | 4       | 89.29%    | 10.71%    | 13m 05s  | −3.57pp     |
| Tue W2 | 200   | 160    | 36     | 4       | 81.63%    | 18.37%    | 15m 30s  | **−7.65pp** |
| Wed W2 | 200   | 158    | 38     | 4       | 80.61%    | 19.39%    | 16m 00s  | −1.02pp     |
| Thu W2 | 200   | 162    | 34     | 4       | 82.65%    | 17.35%    | 15m 40s  | +2.04pp     |
| Fri W2 | 200   | 155    | 41     | 4       | 79.08%    | 20.92%    | 16m 20s  | **−3.57pp** |

> **pp** = percentage points. Pass rate is calculated against 196 active tests (200 − 4 skipped).

---

## 1. Trend Analysis

### The headline numbers

| Metric | Mon W1 | Fri W2 | Change |
|--------|--------|--------|--------|
| Pass rate | 90.82% | 79.08% | **−11.74pp** |
| Failures | 18 | 41 | **+127.8% (+23 tests)** |
| Duration | 12m 30s (750s) | 16m 20s (980s) | **+30.7% (+3m 50s)** |

### Week-over-week deterioration

| Metric | Week 1 Average | Week 2 Average | Change |
|--------|---------------|---------------|--------|
| Pass rate | 89.29% | 82.65% | **−6.64pp** |
| Failures per night | 21.0 | 34.0 | **+61.9% (+13 tests)** |
| Suite duration | 13m 08s (788s) | 15m 19s (919s) | **+16.6% (+131s)** |

### Two distinct patterns in the data

**Pattern 1 — A mid-week spike in Week 1 that partially recovers:**

- Mon W1 and Tue W1 show healthy pass rates (90.82%, 91.84%). 
- Wed W1 drops sharply by 7.65pp to 84.18% (31 failures — nearly double the previous 
  day). 
- Thu and Fri W1 partially recover, with Fri W1 reaching the best result of the entire 
  period at 92.86%.

This spike-and-recovery pattern suggests a **transient event**, likely a bad 
deployment that was rolled back, or a batch of flaky tests that re-ran successfully 
on retry.

**Pattern 2 — A structural collapse starting Tue W2 with no recovery:**

- From Mon W2, the pass rate begins declining again. 
- Tue W2 drops 7.65pp in a single night, the same magnitude as the Wed W1 spike, 
  but this time there is no recovery.
- Wed, Thu, and Fri W2 remain stuck between 79–83%, with Fri W2 setting the worst 
  result of the period at 79.08% (41 failures). 

The suite ends the two weeks 11.74pp worse than it started.

**Critical signal:** After Tue W2, pass rate never exceeds 82.65%. The floor of 
acceptable performance has shifted downward permanently within the observation 
window.

### Duration correlation

Duration correlates almost perfectly with failure count. Every high-failure 
night also has a high duration. This is a significant signal: tests are not 
failing fast they are timing out. A test that asserts on a missing element and 
waits 30 seconds before failing adds 30 seconds of pure waste per test. With 
41 failures on Fri W2 each potentially timing out, the 3m 50s duration
increase is consistent with a large-scale timeout problem.

---

## 2. Three KPIs to Monitor Suite Health

---

### KPI 1 — Nightly Pass Rate (NPR)

**Definition:** The percentage of active tests that pass in the nightly run, 
measured against the total active (non-skipped) test count.

**Formula:**
```
NPR = (Passed Tests / Active Tests) × 100
Active Tests = Total Tests − Permanently Skipped Tests
            = 200 − 4 = 196
```

**Example — Fri W2:**
```
NPR = (155 / 196) × 100 = 79.08%
```

**Target:** ≥ 90%

This target is based on the suite's own best performance (Fri W1: 92.86%) and 
industry standard for regression suites. Allowing 10% failure rate as a floor
acknowledges that some flakiness is normal in a large suite.

**Threshold for action:** < 85% on any single night, OR < 90% average over 3 
consecutive nights.

**Actions when breached:**

- **Single-night breach (85–90%):** Triage the failing tests within 24 hours.
  Classify each failure as: (a) genuine regression, (b) environment issue,
  or (c) flaky test. File tickets for regressions. Do not re-run
  without root-cause investigation.

- **Sustained breach (<90% for 3+ nights):** Escalate to engineering lead.
  Freeze new test additions until the suite is stabilized. Review recent
  deployments and environment changes for correlation.

- **Critical breach (<80%):** Conduct a synchronous team review. If the suite 
is no longer providing reliable signal, running it produces noise, not 
confidence.

---

### KPI 2 — Flaky Test Rate (FTR)

**Definition:** The percentage of tests that produce inconsistent results across 
runs, passing on some nights and failing on others without any code change. Flaky 
tests are the leading cause of false alarms and eroded trust in a suite.

**Formula:**
```
FTR = (Tests that changed result in the last N runs / Active Tests) × 100
```

To calculate this, per-test result history is needed.
In practice, track a test as "flaky" if it has:
- Failed at least once AND
- Passed at least once in the last 5 runs AND
- No confirmed code change explains the flip

**Target:** ≤ 5% (≤ 10 tests in a 196-test suite)

**Threshold for action:** > 5% flaky rate, OR a single test that flips more 
than 3 times in one week.

**Actions when breached:**

- **Quarantine immediately:** Move flaky tests to a dedicated `@flaky` tag 
  or separate CI job. They  should not block the nightly pass/fail signal.

- **Root-cause within one sprint:** Assign each quarantined test. The fix is 
  either: stabilize the test (better waits, more resilient selectors), fix the 
  underlying application race condition, or delete the test if it covers no 
  real risk.

- **Track quarantine duration:** A test that stays quarantined for more than 
  2 sprints should be deleted. Quarantine is not a long-term home.

---

### KPI 3 — Mean Time to Failure Detection (MTTFD) — Suite Duration Trend

**Definition:** The average duration of the nightly suite run, tracked as a 
trend over time. Duration is a proxy for test health: a healthy suite runs in 
roughly the same time each night. A growing duration signals timeouts, slow 
tests, or environment degradation.

**Formula:**
```
MTTFD trend = 7-day rolling average of nightly suite duration (in seconds)

Duration increase % = ((Current Duration − Baseline Duration) / Baseline Duration) × 100
Baseline = average of first 5 runs (Week 1): 788s
```

**Current duration increase:** +30.7% (from 750s to 980s over 10 nights)

**Target:** Duration stays within ±10% of the established baseline.
For this suite: 788s baseline, which means acceptable range is 709s–867s.

**Threshold for action:** > 15% above baseline on a single night (> 906s),
OR a sustained upward trend over 3 consecutive nights.

**Actions when breached:**

- **Identify timeout contributors:** Sort failing tests by duration descending. 
  Each timeout represents wasted CI time.

- **Set shorter, explicit timeouts per test:** Explicit per-test
  timeouts make the suite fail fast and precisely.

- **Profile the slowest passing tests too:** Tests that pass but take 10+
  seconds are often waiting for hardcoded sleeps or polling too slowly.

- **Current situation:** Fri W2 at 980s is 24.4% above the baseline. This alone
  should trigger a triage sprint on test timeouts.

---

## 3. Root Cause Hypotheses

### Hypothesis A — A deployment introduced regressions that were not caught before merge


The pattern of a sharp drop followed by partial recovery (Wed W1) and then
a second sharper drop with no recovery (Tue W2 onwards) is consistent with
two separate deployments. The Wed W1 spike (+13 failures overnight) correlates
with a mid-week deployment. The Fri W1 recovery suggests either a hotfix was
deployed or the failing tests were retried after a transient issue resolved.

The Tue W2 collapse is more severe: +15 failures in a single night, and the
suite never recovers within the observation window. This is consistent with a
deployment that introduced persistent regressions, new behavior that the
existing test assertions do not accept.

The duration increase strongly supports this: if the application is now slower
or returning different responses, tests that wait for specific elements or states
will timeout more frequently, inflating the run time proportionally.

**How to investigate:**

1. For each failure on Tue W2 (36 tests), check whether the failure started
   exactly that night or had been intermittent before. A test that was passing
   for 6 nights and starts failing consistently on Tue W2 is a deployment
   regression, not a flaky test.

2. Compare the failure messages: are the tests failing on the same assertion, 
   or are they scattered across unrelated features? 

3. Check the `git log` or CI deployment pipeline for the specific commits
   merged before each bad run.

---

### Hypothesis B — Test environment instability (infrastructure / data / flakiness)


The Fri W1 recovery is the critical data point. If 17 tests went from failing
on Wed W1 to passing on Fri W1 without a deployment, the most likely explanation
is that the environment was unstable on Wednesday, not the application.


**How to investigate:**

1. **Check infrastructure metrics:** For the nights with bad results: CPU, memory,
   network latency on the test runner and staging server. 

2. **Re-run the failing tests in isolation:** If the tests that failed on Wed W1 and 
Tue W2 pass when run in isolation, the failures are environment-driven, not code-driven.

3. **Check test isolation:** Review whether tests use a shared database or
   shared state. 

4. **Review external dependency availability logs:** Check if any third-party
   services had incidents on the bad nights.

---

## 4. Recommendations 

### Immediate actions

**1. Stop the bleeding — triage Tue W2's 36 failures before adding any new tests.**

Classify every failing test into one of three buckets:

| Bucket | Definition | Action |
|--------|-----------|--------|
| **Genuine regression** | Application behavior changed, test is correct | File a bug, block the relevant feature |
| **Flaky test** | Intermittent, not consistently reproducible | Quarantine with `@flaky` tag, remove from nightly signal |
| **Broken test** | Test is wrong — bad selector, wrong assertion, outdated | Fix or delete within the sprint |

Do not re-run failing tests without completing this triage. Re-running without
understanding why is how flaky tests get normalized.

**2. Implement per-test timeout limits.**

Audit the default timeout configuration and set explicit, realistic timeouts per test category:

```
UI interaction tests:    5,000ms
API response tests:     10,000ms
AJAX / async tests:     20,000ms
End-to-end flow tests:  30,000ms
```

This alone will reduce the suite duration significantly and make failures more
informative (fast failure vs slow timeout).

**3. Correlate failures with deployments.**

Before the sprint ends, produce a simple table mapping each bad night to 
deployments that preceded it. This establishes
the habit of treating test failures as deployment signals, not as background noise.

---



## Summary

| Finding | Evidence |
|---------|---------|
| Pass rate degraded 11.74pp over 2 weeks | 90.82% → 79.08% |
| Failure count increased 127.8% | 18 → 41 failures |
| Suite duration increased 30.7% | 750s → 980s (consistent with timeouts) |
| Two distinct events drove the decline | Wed W1 spike (transient), Tue W2 collapse (persistent) |
| Week 2 average is 6.64pp worse than Week 1 | 89.29% → 82.65% |
| Suite is currently below the 80% critical threshold | Fri W2: 79.08% |

> The suite requires immediate stabilization before it can be trusted as a
regression signal. The current failure rate of ~21%, at this level, the suite 
is producing more noise than confidence.
