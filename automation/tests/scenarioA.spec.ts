import { test, expect } from "@playwright/test";
import { AjaxPage } from "../pages/AjaxPage";

/**
 * Scenario A — Dynamic Content and Waiting
 *
 * Tests the AJAX Data page: http://uitestingplayground.com/ajax
 *
 * What is being tested:
 *   - The trigger button is clickable
 *   - The result label is absent BEFORE the button is clicked
 *   - After clicking, the result label appears within the expected time window
 *   - The label contains the correct text once loaded
 *
 */

const EXPECTED_RESULT_TEXT = "Data loaded with AJAX get request.";

test.describe("Scenario A — Dynamic Content and Waiting", () => {
  let ajaxPage: AjaxPage;

  /**
   * beforeEach: create a fresh AjaxPage and navigate to it before every test.
   * This ensures each test starts from a clean, consistent state.
   */
  test.beforeEach(async ({ page }) => {
    ajaxPage = new AjaxPage(page);
    await ajaxPage.navigate();
  });
  
  // TC-A-01 heading assertion ───────────────────────────────────────────────
  test("TC-A-01 | Page heading reads 'AJAX Data'", async () => {
    const heading = await ajaxPage.getHeading();
    expect(heading).toBe("AJAX Data");
  });

  // TC-A-01: Full flow — click, wait, assert ────────────────────────────────
  test( "TC-A-01 | Loads the AJAX result label after clicking the trigger button", async () => {
    // Step 1: Confirm label is absent before interaction
    expect(await ajaxPage.isResultVisible()).toBe(false);

    // Step 2: Click the trigger button
    await ajaxPage.clickTriggerButton();

    // Step 3: Wait for the result label to appear.
    await ajaxPage.waitForResult(20_000);

    // Step 4: Assert the label is now visible
    const isVisible = await ajaxPage.isResultVisible();
    expect(isVisible).toBe(true);

    // Step 5: Assert the label text is exactly what the spec requires
    const resultText = await ajaxPage.getResultText();
    expect(resultText).toBe(EXPECTED_RESULT_TEXT);
  });

  // TC-A-02: Label absent before click ─────────────────────────────────────
  test("TC-A-02 | Label is absent before the button is clicked", async () => {
    const isVisible = await ajaxPage.isResultVisible();
    expect(isVisible).toBe(false);
  });
});