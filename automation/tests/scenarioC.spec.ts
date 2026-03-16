import { test, expect } from "@playwright/test";
import { DynamicIdPage } from "../pages/DynamicIdPage";
import { OverlappedPage } from "../pages/OverlappedPage";

/**
 * Scenario C — Tricky Selectors
 *
 * Tests two pages:
 *   - Dynamic ID:         http://uitestingplayground.com/dynamicid
 *   - Overlapped Element: http://uitestingplayground.com/overlapped
 *
 * What is being tested:
 *   - Dynamic ID: The button's `id` regenerates on every page load.
 *   - Overlapped Element: The Name input is partially outside the visible viewport.
 *
 */

// DYNAMIC ID TESTS ─────────────────────────────────────────────────────────
test.describe("Scenario C1 — Dynamic ID Page", () => {
  let dynamicIdPage: DynamicIdPage;

  test.beforeEach(async ({ page }) => {
    dynamicIdPage = new DynamicIdPage(page);
    await dynamicIdPage.navigate();
  });

  test("TC-C-00 | Page loads with heading 'Dynamic ID'", async () => {
    const heading = await dynamicIdPage.getHeading();
    expect(heading).toBe("Dynamic ID");
  });

  // TC-C-01: Click with stable selector, second load ──────────────────────
  test("TC-C-01 | Stable selector works after page reload (ID has changed)", async ({ page }) => {
    // Record the ID from the first load
    const idBeforeReload = await dynamicIdPage.getButtonId();

    // Reload the page to trigger a new dynamic ID
    await page.reload();
    dynamicIdPage = new DynamicIdPage(page);

    // Confirm the ID changed 
    const idAfterReload = await dynamicIdPage.getButtonId();
    expect(idAfterReload).not.toBe(idBeforeReload);

    // Selector still finds the button
    await expect(dynamicIdPage.dynamicButton).toBeVisible();

    // Click the selector 
    await dynamicIdPage.clickDynamicButton();

    // Confirm button is still present and page did not crash
    await expect(dynamicIdPage.dynamicButton).toBeVisible();
  });

  // TC-C-02: Prove the ID changes ─────────────────────────────────────────
  test("TC-C-02 | Button ID is different between two page loads", async ({ page }) => {
    // Read the button ID on the first load
    const idOnFirstLoad = await dynamicIdPage.getButtonId();
    expect(idOnFirstLoad).not.toBeNull();

    // Reload the page
    await page.reload();

    dynamicIdPage = new DynamicIdPage(page);

    // Read the button ID on the second load
    const idOnSecondLoad = await dynamicIdPage.getButtonId();
    expect(idOnSecondLoad).not.toBeNull();

    // The IDs must be different 
    expect(idOnFirstLoad).not.toBe(idOnSecondLoad);
  });
});

// OVERLAPPED ELEMENT TESTS ─────────────────────────────────────────────────
test.describe("Scenario C2 — Overlapped Element Page", () => {
  let overlappedPage: OverlappedPage;

  test.beforeEach(async ({ page }) => {
    overlappedPage = new OverlappedPage(page);
    await overlappedPage.navigate();
  });

  test("TC-C-00 | Page loads with heading 'Overlapped Element'", async () => {
    const heading = await overlappedPage.getHeading();
    expect(heading).toBe("Overlapped Element");
  });

  // TC-C-03: Type after scrolling ─────────────────────────────────────────
  test("TC-C-03 | Type into the Name field after scrolling it into view", async () => {
    const testValue = "AutomationTest";

    // Scrolls if needed, focus and set the value 
    await overlappedPage.fillNameField(testValue);

    // Assert the value was correctly entered 
    const enteredValue = await overlappedPage.getNameValue();
    expect(enteredValue).toBe(testValue);
  });
});