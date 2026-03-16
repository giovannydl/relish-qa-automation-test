import { Page } from "@playwright/test";

/**
 * BasePage
 *
 * Abstract base class for all Page Object Models in this framework.
 *
 * All page objects extend this class and receive the page instance via constructor.
 * This follows the standard POM pattern where page interaction logic lives in page 
 * objects.
 */

export abstract class BasePage {
  protected readonly page: Page;
  protected abstract readonly path: string;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to this page using the path defined in the subclass.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.path);
  }

  /**
   * Returns the current page title for heading assertions.
   */
  async getHeading(): Promise<string> {
    return this.page.locator("h3").first().innerText();
  }
}