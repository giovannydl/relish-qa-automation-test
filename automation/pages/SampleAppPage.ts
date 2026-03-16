import { Locator, Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * SampleAppPage — Page Object Model for http://uitestingplayground.com/sampleapp
 *
 * This page presents a login form where:
 *   - Any non-empty username is valid
 *   - The correct password is "pwd"
 *   - On success: status label shows "Welcome, {username}!"
 *   - On failure: status label shows "Invalid username/password"
 *   - The button text toggles between "Log In" and "Log Out"
 */

export class SampleAppPage extends BasePage {
  protected readonly path = "/sampleapp";

  // Locators ────────────────────────────────────────────────────────────────
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly statusLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.locator('[name="UserName"]');
    this.passwordInput = page.locator('[name="Password"]');
    this.loginButton   = page.locator("#login");
    this.statusLabel   = page.locator("#loginstatus");
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Attempts to log in with the provided credentials.
   * @param username The username to enter
   * @param password The password to enter
   */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.clear();
    await this.passwordInput.clear();

    if (username) {
      await this.usernameInput.fill(username);
    }
    if (password) {
      await this.passwordInput.fill(password);
    }

    await this.loginButton.click();
  }

  /**
   * Clicks the logout button
   */
  async logout(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Returns the current text of the status label.
   */
  async getStatusText(): Promise<string> {
    return this.statusLabel.innerText();
  }

  /**
   * Returns the current text of the login/logout button.
   */
  async getButtonText(): Promise<string> {
    return this.loginButton.innerText();
  }

  /**
   * Constructs the expected welcome message for a given username.
   * @param username The username that was used to log in
   * @returns The expected status label text after successful login
   */
  getExpectedWelcomeMessage(username: string): string {
    return `Welcome, ${username}!`;
  }
}