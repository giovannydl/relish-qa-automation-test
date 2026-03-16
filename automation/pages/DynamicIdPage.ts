import { Locator, Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * DynamicIdPage — Page Object Model for http://uitestingplayground.com/dynamicid
 *
 * This page contains a single button whose `id` attribute is regenerated
 * on every page load.
 *
 */

export class DynamicIdPage extends BasePage {
  protected readonly path = "/dynamicid";

  // Locators ────────────────────────────────────────────────────────────────
  readonly dynamicButton: Locator;

  constructor(page: Page) {
    super(page);
    this.dynamicButton = page.locator("button.btn-primary");
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  /**
   * Clicks the dynamic-ID button using the stable class selector.
   */
  async clickDynamicButton(): Promise<void> {
    await this.dynamicButton.click();
  }

  /**
   * Returns the current `id` attribute value of the dynamic button.
   */
  async getButtonId(): Promise<string | null> {
    return this.dynamicButton.getAttribute("id");
  }
}