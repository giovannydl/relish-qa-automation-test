import { Locator, Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * AjaxPage — Page Object Model for http://uitestingplayground.com/ajax
 *
 * This page presents a button that triggers an AJAX request. The server
 * takes ~15 seconds to respond. The result appears as a label with class
 * `bg-success` only after the response arrives.
 */

export class AjaxPage extends BasePage {
  protected readonly path = "/ajax";

  // Locators ────────────────────────────────────────────────────────────────
  readonly triggerButton: Locator;
  readonly resultLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.triggerButton = page.locator("#ajaxButton");
    this.resultLabel = page.locator(".bg-success");
  }

  // Actions ─────────────────────────────────────────────────────────────────

  // Clicks the AJAX trigger button.
  async clickTriggerButton(): Promise<void> {
    await this.triggerButton.click();
  }

  /**
   * Waits for the AJAX result label to become visible.
   * @param timeoutMs Maximum time to wait in milliseconds (default: 20000)
   */
  async waitForResult(timeoutMs = 20_000): Promise<void> {
    await this.resultLabel.waitFor({ state: "visible", timeout: timeoutMs });
  }

  /**
   * Returns the text content of the AJAX result label.
   */
  async getResultText(): Promise<string> {
    return this.resultLabel.innerText();
  }

  /**
   * Checks whether the result label is currently visible in the DOM.
   */
  async isResultVisible(): Promise<boolean> {
    return this.resultLabel.isVisible();
  }
}