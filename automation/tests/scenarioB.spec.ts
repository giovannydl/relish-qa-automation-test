import { test, expect } from "@playwright/test";
import { SampleAppPage } from "../pages/SampleAppPage";

/**
 * Scenario B — Realistic Interactions
 *
 * Tests the Sample App page: http://uitestingplayground.com/sampleapp
 *
 * What is being tested:
 *   - Empty credential submission produces an error state
 *   - Wrong password produces an error state
 *   - Valid credentials produce a personalized welcome message
 *   - The button text changes from "Log In" to "Log Out" after login
 *   - Logout reverts the UI to the logged-out state
 */

const TEST_DATA = {
  validUsername: "alice",
  validPassword: "pwd",
  wrongPassword: "wrongpassword",
  emptyString: "",
};

const EXPECTED = {
  loggedOutStatus:  "User logged out.",
  invalidCredMsg:   "Invalid username/password",
  loginButtonText:  "Log In",
  logoutButtonText: "Log Out",
};

test.describe("Scenario B — Realistic Interactions", () => {
  let sampleAppPage: SampleAppPage;

  /**
   * beforeEach: create a fresh SampleAppPage and navigate to it before every test.
   * This ensures each test starts from a clean, consistent state.
   */
  test.beforeEach(async ({ page }) => {
    sampleAppPage = new SampleAppPage(page);
    await sampleAppPage.navigate();
  });

  test("TC-B-00 | Page loads in logged-out state with 'Log In' button", async () => {
    const status     = await sampleAppPage.getStatusText();
    const buttonText = await sampleAppPage.getButtonText();

    expect(status).toBe(EXPECTED.loggedOutStatus);
    expect(buttonText).toBe(EXPECTED.loginButtonText);
  });

  // TC-B-01: Empty credentials ─────────────────────────────────────────────
  test("TC-B-01 | Empty credentials produce an error message", async () => {
    // Submit with both fields empty
    await sampleAppPage.login(TEST_DATA.emptyString, TEST_DATA.emptyString);

    // Assert error state
    const status = await sampleAppPage.getStatusText();
    expect(status).toBe(EXPECTED.invalidCredMsg);

    // Assert button text has not changed
    const buttonText = await sampleAppPage.getButtonText();
    expect(buttonText).toBe(EXPECTED.loginButtonText);
  });

  // TC-B-02: Wrong password ────────────────────────────────────────────────
  test("TC-B-02 | Valid username with wrong password produces an error message", async () => {
    await sampleAppPage.login(TEST_DATA.validUsername, TEST_DATA.wrongPassword);

    const status = await sampleAppPage.getStatusText();
    expect(status).toBe(EXPECTED.invalidCredMsg);

    const buttonText = await sampleAppPage.getButtonText();
    expect(buttonText).toBe(EXPECTED.loginButtonText);
  });

  // TC-B-03: Successful login ──────────────────────────────────────────────
  test("TC-B-03 | Valid credentials show a personalized welcome message", async () => {
    await sampleAppPage.login(TEST_DATA.validUsername, TEST_DATA.validPassword);

    // Assert welcome message
    const expectedMessage = sampleAppPage.getExpectedWelcomeMessage(
      TEST_DATA.validUsername
    );
    const status = await sampleAppPage.getStatusText();
    expect(status).toBe(expectedMessage);

    // Button text changes to 'Log Out' after successful login
    const buttonText = await sampleAppPage.getButtonText();
    expect(buttonText).toBe(EXPECTED.logoutButtonText);
  });

  // TC-B-04: Logout ────────────────────────────────────────────────────────
  test("TC-B-04 | logout reverts the page to logged-out state", async () => {
    await sampleAppPage.login(TEST_DATA.validUsername, TEST_DATA.validPassword);

    const buttonTextAfterLogin = await sampleAppPage.getButtonText();
    expect(buttonTextAfterLogin).toBe(EXPECTED.logoutButtonText);

    await sampleAppPage.logout();

    // Assert: page reverts to initial logged-out state
    const statusAfterLogout = await sampleAppPage.getStatusText();
    expect(statusAfterLogout).toBe(EXPECTED.loggedOutStatus);

    const buttonTextAfterLogout = await sampleAppPage.getButtonText();
    expect(buttonTextAfterLogout).toBe(EXPECTED.loginButtonText);
  });
});