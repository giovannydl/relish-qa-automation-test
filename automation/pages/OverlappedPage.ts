import { Locator, Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * OverlappedPage — Page Object Model for http://uitestingplayground.com/overlapped
 *
 * This page contains input fields that are partially outside the visible viewport.
 */

export class OverlappedPage extends BasePage {
  protected readonly path = "/overlapped";

  // Locators ────────────────────────────────────────────────────────────────
  readonly nameInput: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.locator("#id");
  }

  // Actions ─────────────────────────────────────────────────────────────────

  /**
   * Scrolls the Name input into the visible viewport and types the given value.
   * @param value The text to enter into the Name field
   */
  async fillNameField(value: string): Promise<void> {
    // Scroll the element into the viewport if it isn't visible
    await this.nameInput.scrollIntoViewIfNeeded();

    // Click to focus
    await this.nameInput.click();

    // Fill with the new value
    await this.nameInput.fill(value);
  }

  /**
   * Returns the current value of the Name input field.
   */
  async getNameValue(): Promise<string> {
    return this.nameInput.inputValue();
  }

  /**
   * Checks whether the Name input is within the visible viewport.
   */
  async isNameInputInViewport(): Promise<boolean> {
    return this.nameInput.isVisible();
  }
}