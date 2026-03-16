# Test Case Documentation — UI Testing Playground

**Site under test:** http://uitestingplayground.com/  
**Author:** Giovanny De León  
**Role:** Senior QA Engineer  
**Scope:** Scenarios A, B, and C 

---

## About the Documentation

Each test case follows this structure:

| Field               | Description |
|---------------------|-------------|
| **Test Case ID**    | Unique identifier. Format: `TC-[SCENARIO]-[NUMBER]` |
| **Description**     | One sentence that explains what the test validates |
| **Preconditions**   | What must be true before the test starts |
| **Test Steps**      | Numbered, detailed, reproducible steps |
| **Test Data**       | Any input values used in the test |
| **Expected Result** | The observable, verifiable outcome |
| **Status**          | Pass/Fail |
| **Notes**           | Implementation challenges or observations |

---

---

# SCENARIO A — Dynamic Content and Waiting

**Page:** http://uitestingplayground.com/ajax

## Automation Reasoning

### What makes this challenging

This scenario tests a very common problem, an element that does not exist in the DOM 
yet. When the button is clicked, the response takes approximately 15 seconds to arrive.

During that time:
- The label element is absent from the DOM.
- Any assertion attempted too early will fail with "element not found".
- The exact delay is approximate, it could vary depending on network conditions.

### Strategy: dynamic explicit wait, never a hardcoded sleep
The approach for this scenario is an explicit wait with a condition: poll the DOM at short
intervalsuntil the target element appears or a maximum timeout is reached. In Playwright 
is used `await page.waitForSelector()`.

## TC-A-01 — Click AJAX button and wait for label to appear

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-A-01 |
| **Description**  | Verifies that clicking the AJAX trigger button eventually renders a label with the expected text after the server response is received. |
| **Preconditions** | 1. Browser is open. <br>2. Network connection is available. <br>3. The AJAX page is accessible at `http://uitestingplayground.com/ajax`. |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to the AJAX Data page | Open `http://uitestingplayground.com/ajax` |
| 2 | Verify the page title | Assert the heading reads **"AJAX Data"** |
| 3 | Confirm the loaded label is NOT present | Assert no element with class `bg-success` is visible in the DOM before clicking |
| 4 | Locate the trigger button | Find the button with the label **"Button Triggering AJAX Request"** |
| 5 | Click the trigger button | Single  click on the button |
| 6 | Assert label is visible | Confirm the label is now present and visible in the DOM |
| 8 | Assert label text | Verify the label text is exactly **"Data loaded with AJAX get request."** |

### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/ajax` |
| Trigger button selector | `button.btn-primary` |
| Result label selector | `.bg-success` |
| Expected label text | `Data loaded with AJAX get request.` |

### Expected Result

- The page loads successfully displaying the heading "AJAX Data".
- Before clicking, no success label is visible.
- After clicking the button and waiting (≈15 seconds), a green label appears.
- The label reads exactly: **"Data loaded with AJAX get request."**

### Actual Result

- Page loaded correctly with heading "AJAX Data".
- Result label was absent before click.
- After clicking and waiting ~15 seconds, label appeared with text **"Data loaded with AJAX get request."**

### Status
Pass

---

## TC-A-02 — Verify label is absent before button is clicked

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-A-02 |
| **Description**  | Verifies that the success label does NOT exist in the DOM prior to any interaction, confirming the AJAX is not pre-loaded. |
| **Preconditions** | 1. Browser is open. <br>2. AJAX page is accessible. |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to `http://uitestingplayground.com/ajax` | Fresh page load, no prior interactions |
| 2 | Immediately check for the label | Without clicking anything, query the DOM for `.bg-success` |
| 3 | Assert label is absent | Confirm the element is NOT present or NOT visible |

### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/ajax` |
| Label selector | `.bg-success` |

### Expected Result

- The label element with class `bg-success` is not present in the DOM on initial page load.
- No success text is visible to the user.

### Actual Result

- `isVisible()` returned `false` immediately on page load.
- No element was found in the DOM before any interaction.

### Status
Pass

---

## TC-A-03 — Verify behavior when wait timeout is exceeded (negative test)

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-A-03 |
| **Description**  | Verifies that the test framework correctly times out and reports an error when the AJAX label does not appear within a deliberately short timeout window. This is a negative test to validate the waiting mechanism itself. |
| **Preconditions** | 1. Browser is open. <br>2. AJAX page is accessible. |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to `http://uitestingplayground.com/ajax` | Fresh page load |
| 2 | Click the trigger button | Single click |
| 3 | Wait for the label with a 3-second timeout | This is intentionally shorter than the ~15 second AJAX delay |
| 4 | Assert that a timeout error is thrown | The wait mechanism should raise a timeout exception |

### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/ajax` |
| Intentional timeout | 3 seconds (insufficient — for negative testing) |

### Expected Result

- The wait times out after 3 seconds because the AJAX response has not arrived yet.
- A timeout or "element not found" error is raised by the framework.
- This test is expected to fail at the wait step — confirming the wait mechanism is actually enforcing its timeout condition.

### Notes

- This test was excluded from the default suite and is a negative/infrastructure test. It proves the wait mechanism enforces its
  timeout boundary correctly.
---

---

# SCENARIO B — Realistic Interactions

**Page:** http://uitestingplayground.com/sampleapp

## Automation Reasoning

### What makes this challenging

This scenario involves three distinct automation challenges:

1. **Empty field validation**: The test must explicitly submit the form with empty 
   fields and then assert on the resulting error state, not just on the absence of
   a success state.

2. **Dynamic text verification containing variable input**: The assertion cannot be
   a hardcoded exact-match string, it must either use a `contains()` / `includes()`
   check or construct the expected string dynamically from the test data.

3. **Button text state change** — The button's label changes from "Log In" to
   "Log Out" after successful authentication. Tthis scenario specifically
   requires verifying the UI state of the button itself, a behavioral assertion,
   not just a content assertion.

### Strategy

- For empty credential validation: submit directly without filling fields and assert
  on the error message text.
- For the success message: build the expected string from the test data variable.
- For the button text change: query the button element after login and assert it is
  correct.

---

## TC-B-01 — Login attempt with empty credentials shows error

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-B-01 |
| **Description**  | Verifies that submitting the login form with both fields empty displays the appropriate error state. |
| **Preconditions** | 1. Browser is open. <br>2. Sample App page is accessible at `http://uitestingplayground.com/sampleapp`. <br>3. User is in a logged-out state (status label reads "User logged out."). |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to `http://uitestingplayground.com/sampleapp` | Fresh page load |
| 2 | Verify initial state | Assert the status label reads **"User logged out."** |
| 3 | Verify button initial text | Assert the login button text reads **"Log In"** |
| 4 | Leave username field empty | Do not interact with the username input (`[name="UserName"]`) |
| 5 | Leave password field empty | Do not interact with the password input (`[name="Password"]`) |
| 6 | Click the "Log In" button | Single click on `button#login` |
| 7 | Assert error state | Verify the status label text reads **"Invalid username/password"** |
| 8 | Assert button text unchanged | Verify the button still reads **"Log In"** (not "Log Out") |

### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/sampleapp` |
| Username | *(empty)* |
| Password | *(empty)* |
| Login button selector | `button#login` |
| Username field selector | `[name="UserName"]` |
| Password field selector | `[name="Password"]` |
| Status label selector | `#loginstatus` |
| Expected error message | `Invalid username/password` |

### Expected Result

- The status label changes from "User logged out." to **"Invalid username/password"**.
- The button text remains **"Log In"** — the user is not authenticated.
- No welcome message is shown.

### Actual Result

- Status label updated to **"Invalid username/password"** immediately after clicking.
- Button text remained **"Log In"**.
- No welcome message was shown.

### Status
Pass

---

## TC-B-02 — Login attempt with valid username and wrong password shows error

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-B-02 |
| **Description**  | Verifies that submitting with a valid username but incorrect password displays the error state. |
| **Preconditions** | 1. Browser is open and on the Sample App page. <br>2. User is logged out. |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to `http://uitestingplayground.com/sampleapp` | Fresh page load |
| 2 | Enter username | Type `testuser` into `[name="UserName"]` |
| 3 | Enter wrong password | Type `wrongpassword` into `[name="Password"]` |
| 4 | Click "Log In" | Single click on `button#login` |
| 5 | Assert error message | Verify status label reads **"Invalid username/password"** |
| 6 | Assert button text unchanged | Verify button still reads **"Log In"** |

### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/sampleapp` |
| Username | `testuser` |
| Password | `wrongpassword` |
| Expected error message | `Invalid username/password` |

### Expected Result

- Status label reads **"Invalid username/password"**.
- Button text remains **"Log In"**.
- User is not authenticated.

### Actual Result

- Status label showed **"Invalid username/password"** after submitting.
- Button remained **"Log In"**.

### Status
Pass

---

## TC-B-03 — Successful login with valid credentials

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-B-03 |
| **Description**  | Verifies that submitting with a non-empty username and the correct password (`pwd`) authenticates the user, displays a personalized welcome message, and changes the button text to "Log Out". |
| **Preconditions** | 1. Browser is open and on the Sample App page. <br>2. User is in logged-out state. |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to `http://uitestingplayground.com/sampleapp` | Fresh page load |
| 2 | Verify initial logged-out state | Assert status label reads **"User logged out."** |
| 3 | Verify button initial text | Assert button reads **"Log In"** |
| 4 | Enter username | Type `gio` into `[name="UserName"]` |
| 5 | Enter password | Type `pwd` into `[name="Password"]` |
| 6 | Click "Log In" | Single click on `button#login` |
| 7 | Assert welcome message contains username | Verify status label **contains** the text `"Welcome, gio!"` — built dynamically from the test data variable, not hardcoded |
| 8 | Assert button text changed | Verify the button text is now exactly **"Log Out"** |

### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/sampleapp` |
| Username | `gio` |
| Password | `pwd` |
| Expected status message | `Welcome, gio!` (constructed as `"Welcome, " + username + "!"`) |
| Expected button text after login | `Log Out` |

### Expected Result

- The status label reads **"Welcome, gio!"**.
- The login button text changes to **"Log Out"**.
- The user is considered authenticated by the UI.

### Actual Result

- Status label showed **"Welcome, gio!"** immediately after login.
- Button text changed to **"Log Out"**.
- Dynamic assertion worked.

### Status
Pass

---

## TC-B-04 — Logout after successful login

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-B-04 |
| **Description**  | Verifies that clicking "Log Out" after a successful login returns the application to the logged-out state. |
| **Preconditions** | 1. TC-B-03 has been completed successfully. <br>2. User is currently logged in as `gio`. <br>3. Button reads "Log Out". |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Confirm logged-in state | Verify status label contains `"Welcome, gio!"` and button reads `"Log Out"` |
| 2 | Click "Log Out" | Single click on the button |
| 3 | Assert logged-out status | Verify status label reads **"User logged out."** |
| 4 | Assert button text reverted | Verify button text is back to **"Log In"** |

### Test Data

| Key | Value |
|-----|-------|
| Username used in prior login | `gio` |
| Expected status after logout | `User logged out.` |
| Expected button text after logout | `Log In` |

### Expected Result

- Status label reads **"User logged out."**
- Button text reverts to **"Log In"**.
- The full login/logout cycle completes correctly.

### Actual Result

- After clicking "Log Out", status label reverted to **"User logged out."** 
- Button text reverted to **"Log In"**. 

### Status
Pass
---

---

# SCENARIO C — Tricky Selectors

**Pages:**
- Dynamic ID: http://uitestingplayground.com/dynamicid
- Overlapped Element: http://uitestingplayground.com/overlapped

## Automation Reasoning

### What makes the Dynamic ID page challenging

The button's `id` attribute is regenerated on every page load. Most record-and-playback tools
capture the ID and hardcode it as the selector, producing a test that breaks immediately on 
re-run.

**Strategy:** Never use the `id` attribute for this button. Instead, use a selector
that targets a stable attribute.

### What makes the Overlapped Element page challenging

The input field is partially hidden, it is scrolled out of the visible viewport. Automation 
tools that try to click or type into an element that is not fully visible will fail silently.

**Strategy:** Before interacting with the input, explicitly scroll it into the
viewport . After scrolling, verify the element isfully visible before typing.

---

## TC-C-01 — Click button with dynamic ID using stable selector

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-C-01 |
| **Description**  | Verifies that the button on the Dynamic ID page can be reliably clicked across multiple page loads without using the `id` attribute. |
| **Preconditions** | 1. Browser is open. <br>2. Dynamic ID page is accessible at `http://uitestingplayground.com/dynamicid`. |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to `http://uitestingplayground.com/dynamicid` | Fresh page load |
| 2 | Verify page heading | Assert the heading reads **"Dynamic ID"** |
| 3 | Click the button | Single click using the stable selector |
| 4 | Verify click was registered | Assert no error is thrown and the page does not navigate away (the button produces no visible side-effect — success = no crash) |
| 5 | Reload the page | Trigger a full page refresh|
| 6 | Read the button's `id` again | Confirm the `id` attribute has a **different value** than in Step 3 |
| 7 | Click the button again using the same stable selector | Single click — the selector must still work despite the new `id` |

### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/dynamicid` |
| Selector to never use | `#dynBtn_[anyValue]` (dynamic ID — breaks on reload) |

### Expected Result

- The button is clicked successfully on the first page load.
- After reload, the button's `id` attribute is different.
- The button is clicked successfully again using the same stable selector.
- The test passes on both loads without modifying the selector, proving the strategy is reload-proof.

### Actual Result

- Button clicked successfully on first load using `button.btn-primary`.
- After reload, `id` attribute had a new value.
- Same selector located and clicked the button again.

### Status
Pass

---

## TC-C-02 — Confirm dynamic ID changes between page loads

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-C-02 |
| **Description**  | Explicitly verifies that the button's `id` attribute is different between two page loads, documenting the root cause of the selector instability. |
| **Preconditions** | 1. Browser is open. <br>2. Dynamic ID page is accessible. |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to `http://uitestingplayground.com/dynamicid` | First page load |
| 2 | Read button `id` | Capture the `id` attribute value as `id_load_1` |
| 3 | Reload the page | Navigate to the same URL again |
| 4 | Read button `id` again | Capture the `id` attribute value as `id_load_2` |
| 5 | Assert IDs are different | Verify `id_load_1 !== id_load_2` |

### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/dynamicid` |


### Expected Result

- `id_load_1` and `id_load_2` are different strings.
- This confirms the `id` is genuinely dynamic and cannot be used as a selector.

### Actual Result

- Dynamic ID changes after reload. 

### Status
Pass

---

## TC-C-03 — Type into overlapped input field after scrolling into view

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-C-03 |
| **Description**  | Verifies that text can be entered into the partially-hidden Name input field on the Overlapped Element page by first scrolling it into the visible viewport. |
| **Preconditions** | 1. Browser is open. <br>2. Overlapped Element page is accessible at `http://uitestingplayground.com/overlapped`. <br>3. Browser viewport is set to a standard size (e.g. 1280×720). |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to `http://uitestingplayground.com/overlapped` | Fresh page load |
| 2 | Verify page heading | Assert the heading reads **"Overlapped Element"** |
| 3 | Locate the Name input field | Find the input using `[name="Name"]` or `#id`, the element exists in the DOM but may not be in the viewport |
| 4 | Verify element is not fully visible | Assert the element's bounding box is outside or partially outside the visible viewport — confirming the scroll is necessary |
| 5 | Scroll the element into view | Element is displayed on screen |
| 6 | Verify element is now fully visible | Assert the element's bounding box is fully within the viewport after scrolling |
| 7 | Click the input field | Single click to focus |
| 8 | Type the test value | Enter `"AutomationTest"` into the Name field |
| 9 | Assert the typed value | Read the input's `value` attribute and verify it equals `"AutomationTest"` |

### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/overlapped` |
| Input field selector | `[name="Name"]` |
| Text to type | `AutomationTest` |
| Expected `value` after typing | `AutomationTest` |

### Expected Result

- The Name input field scrolls into full visibility before interaction.
- The text `"AutomationTest"` is typed successfully.
- Reading the input's value confirms it contains exactly `"AutomationTest"`.
- No "element not interactable" or "element not visible" errors are thrown.

### Actual Result

- Scrolled the Name field into the visible viewport.
- Entered the value without errors.
- No interactability errors were thrown.

### Status
Pass

---

## TC-C-04 — Verify that interacting without scrolling fails (negative test)

| Field            | Detail |
|------------------|--------|
| **Test Case ID** | TC-C-04 |
| **Description**  | Verifies that attempting to type into the overlapped input without scrolling first results in an error or incorrect behavior, proving the scroll step is necessary. |
| **Preconditions** | 1. Browser is open. <br>2. Overlapped Element page is accessible. |

### Test Steps

| Step | Action | Detail |
|------|--------|--------|
| 1 | Navigate to `http://uitestingplayground.com/overlapped` | Fresh page load |
| 2 | Locate the Name input field | Field is located |
| 3 | Attempt to type directly | Try to type `"NoScroll"` into the field without any scroll interaction |
| 4 | Assert that an error is raised OR the value was not entered correctly | Error is thrown
### Test Data

| Key | Value |
|-----|-------|
| Page URL | `http://uitestingplayground.com/overlapped` |
| Input field selector | `[name="Name"]` |
| Text to type (should fail) | `NoScroll` |

### Expected Result

- The interaction fails with an error, OR the value is not correctly entered.
- This confirms that direct interaction without scrolling is unreliable.
- This test is expected to fail at the interaction step, it is a negative test to prove the necessity of the scroll step in TC-C-03.

### Notes

- This test was excluded from the default suite and is a negative/infrastructure test. 
---

---

# Summary Table

| Test Case ID | Scenario | Type     | Description |
|--------------|----------|----------|-------------|
| TC-A-01      | A        | Positive | AJAX button click + explicit wait + label text assertion |
| TC-A-02      | A        | Positive | Label absent before button click |
| TC-A-03      | A        | Negative | Timeout expires before AJAX completes |
| TC-B-01      | B        | Negative | Login with empty credentials → error message |
| TC-B-02      | B        | Negative | Login with wrong password → error message |
| TC-B-03      | B        | Positive | Login with valid credentials → welcome message + button text change |
| TC-B-04      | B        | Positive | Logout after login → reverts to logged-out state |
| TC-C-01      | C        | Positive | Click dynamic-ID button using stable CSS/XPath selector |
| TC-C-02      | C        | Positive | Confirm button ID changes between page loads |
| TC-C-03      | C        | Positive | Type into overlapped input after scrolling into view |
| TC-C-04      | C        | Negative | Type into overlapped input WITHOUT scroll -> fails |

**Total: 11 test cases** (8 positive, 3 negative)
