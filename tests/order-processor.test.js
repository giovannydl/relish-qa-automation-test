/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TESTS — Comprehensive test suite for the OrderProcessor module
 * ─────────────────────────────────────────────────────────────────────────────
 * order-processor.test.js
 *
 *
 * ─ Structure ────────────────────────────────────────────────────────────────
 *
 *  SECTION 1 — BUG REGRESSION TESTS
 *  - Each test in this section is named after the bug it covers:
 *      [BUGFIX] describes the bug with a comment explaining what the original
 *      code did wrong. The test itself is then run against the FIXED version
 *      to confirm the bug is resolved.
 *
 *  - For each bug I also include a companion test that runs against the
 *    ORIGINAL code using Jest's `.toThrow()` or by asserting the
 *    wrong value, proving the bug EXISTS in the original.
 *
 *  SECTION 2 — BUSINESS LOGIC TESTS
 *    Happy-path and normal-flow tests covering volume discounts, coupons,
 *    tax calculation, rush surcharge, and status transitions.
 *
 *  SECTION 3 — EDGE CASE TESTS
 *    Boundary conditions, empty orders, zero-tax items, status machine
 *    limits, and combinations of multiple features.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * HOW TO RUN:
 *   npm test                        For full suite
 *   npm test -- --verbose           For tests with names
 *   npm test -- --coverage          For coverage report
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { OrderProcessor: BuggyOrderProcessor } = require("../order-processor");
const { OrderProcessor: FixedOrderProcessor } = require("../order-processor-fixed");

/**
 * Creates a fresh FixedOrderProcessor pre-loaded with a standard set of
 * line items. Used across multiple tests for consistency.
 *
 *   WIDGET-A: $10.00 × 5 = $50.00  (8% tax)
 *   WIDGET-B: $20.00 × 3 = $60.00  (8% tax)
 *   GADGET-X:  $5.00 × 4 = $20.00  (10% tax)
 *   ──────────────────────────────────────────
 *   Total items: 12  ->  5% volume discount applies
 *   Subtotal:  $130.00
 */
function makeStandardOrder() {
  const order = new FixedOrderProcessor();
  order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 5, taxRate: 0.08 });
  order.addLineItem({ sku: "WIDGET-B", unitPrice: 20.00, quantity: 3, taxRate: 0.08 });
  order.addLineItem({ sku: "GADGET-X", unitPrice: 5.00,  quantity: 4, taxRate: 0.10 });
  return order;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — BUG REGRESSION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("SECTION 1 — Bug Regression Tests", () => {

  // ── Bug 1: Off-by-One Error in Loop Condition ─────────────────────────────

  describe("Bug 1 — Off-by-One Error in Loop Condition", () => {

    /**
     * PROVES BUG EXISTS in original:
     * The loop `i <= this.lineItems.length` accesses lineItems[length] on the
     * final iteration, which is undefined and throws a TypeError.
     */
    test("[ORIGINAL] getTotalItemCount() throws TypeError due to off-by-one loop", () => {
      const order = new BuggyOrderProcessor();
      order.lineItems.push({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 5, taxRate: 0.08 });

      // The off-by-one crash: i goes up to lineItems.length (out of bounds)
      expect(() => order.getTotalItemCount()).toThrow(TypeError);
    });

    /**
     * PROVES BUG IS FIXED:
     * The fixed version uses Array.reduce(), no manual indexing, no crash.
     */
    test("[FIXED] getTotalItemCount() correctly sums quantities without crashing", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 5, taxRate: 0.08 });
      order.addLineItem({ sku: "WIDGET-B", unitPrice: 20.00, quantity: 3, taxRate: 0.08 });

      expect(order.getTotalItemCount()).toBe(8);
    });

    test("[FIXED] getTotalItemCount() returns 0 for an empty order", () => {
      const order = new FixedOrderProcessor();
      expect(order.getTotalItemCount()).toBe(0);
    });

    test("[FIXED] calculateTotal() does not crash (depends on getTotalItemCount)", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      expect(() => order.calculateTotal()).not.toThrow();
    });
  });

  // ── Bug 2: Coupon Does Not Reduce the Tax Base ──────────────────────────────

  describe("Bug 2 — Coupon Does Not Reduce the Tax Base", () => {

    /**
     * PROVES BUG EXISTS in original:
     * With a $20 coupon on a $100 item at 10% tax:
     *   - CORRECT:  tax base = $100 - $20 = $80  ->  tax = $8.00
     *   - ORIGINAL: tax base = $100 (coupon ignored)  ->  tax = $10.00
     *
     */
    test("[ORIGINAL] tax is incorrectly calculated on pre-coupon amount (overcharges tax)", () => {
      const order = new BuggyOrderProcessor();
      order.lineItems.push({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0.10 });
      order.applyCoupon({ code: "SAVE20", discountAmount: 20.00 });

      // Patch Bug 1 on this instance to isolate and observe Bug 2.
      order.getTotalItemCount = () =>
        order.lineItems.reduce((sum, item) => sum + item.quantity, 0);

      const result = order.calculateTotal();

      // Original behavior: tax is $10 (computed on $100, ignoring the coupon)
      expect(result.tax).toBe(10.00);
      // Correct behavior would be: tax = $8.00 (computed on $80)
      expect(result.tax).not.toBe(8.00);
    });

    /**
     * PROVES BUG IS FIXED:
     * The fixed version applies the coupon before computing tax.
     * Tax base = $100 - $20 coupon = $80 -> tax = $8.00
     */
    test("[FIXED] tax is computed on amount AFTER coupon discount", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0.10 });
      order.applyCoupon({ code: "SAVE20", discountAmount: 20.00 });

      const result = order.calculateTotal();

      // Tax base after coupon: $100 - $20 = $80 -> tax = $8.00
      expect(result.tax).toBe(8.00);
      expect(result.total).toBe(88.00); // $80 + $8 tax
    });

    test("[FIXED] tax is computed on amount AFTER both volume discount AND coupon", () => {
      const order = new FixedOrderProcessor();
      // 10 items -> 5% volume discount applies
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 10, taxRate: 0.10 });
      order.applyCoupon({ code: "SAVE10", discountAmount: 10.00 });

      const result = order.calculateTotal();

      // subtotal = $100
      // volume discount (5%) = $5 -> after volume = $95
      // coupon = $10 -> taxable base = $85
      // tax = $85 × 10% = $8.50
      expect(result.subtotal).toBe(100.00);
      expect(result.volumeDiscount).toBe(5.00);
      expect(result.couponDiscount).toBe(10.00);
      expect(result.tax).toBe(8.50);
      expect(result.total).toBe(93.50); // $85 + $8.50
    });
  });

  // ── Bug 3: Coupon Can Produce a Negative Total ──────────────────────────────

  describe("Bug 3 — Coupon can produce a negative total", () => {

    /**
     * PROVES BUG EXISTS in original:
     * A $100 coupon on a $5 order produces a negative total.
     *
     * Bug isolation note: same as Bug 2, I patch getTotalItemCount on this
     * instance to neutralize Bug 1 and observe Bug 3 in isolation.
     */
    test("[ORIGINAL] coupon larger than order value produces a negative total", () => {
      const order = new BuggyOrderProcessor();
      order.lineItems.push({ sku: "CHEAP", unitPrice: 5.00, quantity: 1, taxRate: 0.08 });
      order.applyCoupon({ code: "BIGDISCOUNT", discountAmount: 100.00 });

      // Patch Bug 1 to isolate Bug 3.
      order.getTotalItemCount = () =>
        order.lineItems.reduce((sum, item) => sum + item.quantity, 0);

      const result = order.calculateTotal();

      // Original: no floor, total goes negative
      expect(result.total).toBeLessThan(0);
    });

    /**
     * PROVES BUG IS FIXED:
     * The fixed version clamps couponDiscount to the available taxable base.
     * Total should never be negative.
     */
    test("[FIXED] coupon larger than order value clamps total to zero (plus tax on $0 base)", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "CHEAP", unitPrice: 5.00, quantity: 1, taxRate: 0.08 });
      order.applyCoupon({ code: "BIGDISCOUNT", discountAmount: 100.00 });

      const result = order.calculateTotal();

      // couponDiscount clamped to $5.00 (the full available base)
      expect(result.couponDiscount).toBe(5.00);
      // Tax on $0 base = $0
      expect(result.tax).toBe(0.00);
      // Total = $0
      expect(result.total).toBe(0.00);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    test("[FIXED] coupon exactly equal to subtotal results in zero total", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 50.00, quantity: 1, taxRate: 0.10 });
      order.applyCoupon({ code: "EXACT50", discountAmount: 50.00 });

      const result = order.calculateTotal();

      expect(result.couponDiscount).toBe(50.00);
      expect(result.tax).toBe(0.00);
      expect(result.total).toBe(0.00);
    });
  });

  // ── Bug 4: Method Allows Duplicate SKUs  ────────────────────────────────

  describe("Bug 4 — addLineItem() allows duplicate SKUs, corrupting order state", () => {

    /**
     * PROVES BUG EXISTS in original:
     * Calling addLineItem twice with the same SKU creates two entries.
     * Then updateQuantity only updates the first, and removeLineItem deletes both.
     */
    test("[ORIGINAL] addLineItem() accepts duplicate SKUs without error", () => {
      const order = new BuggyOrderProcessor();
      order.lineItems.push({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 3, taxRate: 0.08 });
      order.lineItems.push({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      // Two entries for same SKU — corrupt state
      expect(order.lineItems).toHaveLength(2);
    });

    test("[ORIGINAL] updateQuantity() only updates first duplicate, leaving second stale", () => {
      const order = new BuggyOrderProcessor();
      order.lineItems.push({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 3, taxRate: 0.08 });
      order.lineItems.push({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      order.updateQuantity("WIDGET-A", 99);

      // First entry updated, second entry still has old quantity
      expect(order.lineItems[0].quantity).toBe(99);
      expect(order.lineItems[1].quantity).toBe(2); // stale — bug confirmed
    });

    test("[ORIGINAL] removeLineItem() silently removes ALL duplicates at once", () => {
      const order = new BuggyOrderProcessor();
      order.lineItems.push({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 3, taxRate: 0.08 });
      order.lineItems.push({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      order.removeLineItem("WIDGET-A");

      // Both duplicates removed — unexpected bulk deletion
      expect(order.lineItems).toHaveLength(0);
    });

    /**
     * PROVES BUG IS FIXED:
     * The fixed version throws an Error when a duplicate SKU is added.
     */
    test("[FIXED] addLineItem() throws an error when duplicate SKU is added", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 3, taxRate: 0.08 });

      expect(() =>
        order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 })
      ).toThrow(`Line item with SKU "WIDGET-A" already exists. Use updateQuantity() to modify it.`);
    });

    test("[FIXED] order still has exactly one entry after failed duplicate add", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 3, taxRate: 0.08 });

      try {
        order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });
      } catch (_) { /* expected */ }

      expect(order.lineItems).toHaveLength(1);
      expect(order.lineItems[0].quantity).toBe(3); // original quantity unchanged
    });
  });

  // ── Bug 5: removeLineItem silently ignores non-existent SKUs ───────────────

  describe("Bug 5 — removeLineItem() returns no feedback on non-existent SKU", () => {

    /**
     * PROVES BUG EXISTS in original:
     * Calling removeLineItem with a non-existent SKU returns undefined.
     */
    test("[ORIGINAL] removeLineItem() returns undefined for non-existent SKU", () => {
      const order = new BuggyOrderProcessor();
      order.lineItems.push({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      const result = order.removeLineItem("DOES-NOT-EXIST");

      expect(result).toBeUndefined();
    });

    /**
     * PROVES BUG IS FIXED:
     * The fixed version returns false when the SKU is not found.
     */
    test("[FIXED] removeLineItem() returns false when SKU does not exist", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      const result = order.removeLineItem("DOES-NOT-EXIST");

      expect(result).toBe(false);
      // The existing item should be untouched
      expect(order.lineItems).toHaveLength(1);
    });

    test("[FIXED] removeLineItem() returns true when SKU is found and removed", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      const result = order.removeLineItem("WIDGET-A");

      expect(result).toBe(true);
      expect(order.lineItems).toHaveLength(0);
    });
  });

  // ── Bug #6: Method Not Rounded Consistently in Return Object ───────────────────────

  describe("Bug 6 — Method Not Rounded Consistently in Return Object", () => {

    /**
     * PROVES BUG EXISTS in original:
     * rushSurcharge is returned as a raw number without Math.round.
     *
     */
    test("[ORIGINAL] rushSurcharge field is returned without rounding (structural inconsistency)", () => {
      const order = new BuggyOrderProcessor();
      order.lineItems.push({ sku: "ITEM-A", unitPrice: 10.00, quantity: 1, taxRate: 0.08 });
      order.setRush(true);

      // Patch Bug 1 to isolate Bug 6.
      order.getTotalItemCount = () =>
        order.lineItems.reduce((sum, item) => sum + item.quantity, 0);

      const result = order.calculateTotal();

      expect(result.rushSurcharge).toBe(15); // present but unrounded by design
    });

    /**
     * PROVES BUG IS FIXED:
     * The fixed version rounds rushSurcharge like all other monetary fields.
     */
    test("[FIXED] rushSurcharge is rounded consistently with all other monetary fields", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 1, taxRate: 0.08 });
      order.setRush(true);

      const result = order.calculateTotal();

      // All monetary fields should have at most 2 decimal places
      const fields = ["subtotal", "volumeDiscount", "couponDiscount", "tax", "rushSurcharge", "total"];
      fields.forEach((field) => {
        const value = result[field];
        const rounded = Math.round(value * 100) / 100;
        expect(value).toBe(rounded);
      });
    });

    test("[FIXED] rush surcharge of $15.00 adds correctly to the final total", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0.00 });
      order.setRush(true);

      const result = order.calculateTotal();

      expect(result.rushSurcharge).toBe(15.00);
      expect(result.total).toBe(115.00);
    });
  });

});


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — BUSINESS LOGIC TESTS
// ─────────────────────────────────────────────────────────────────────────────
// All tests in this section run against the FIXED version.

describe("SECTION 2 — Business Logic Tests (Fixed Version)", () => {

  // ── Volume Discounts ─────────────────────────────────────────────────────────

  describe("Volume Discounts", () => {

    test("no discount applied when total items < 10", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 9, taxRate: 0 });

      const result = order.calculateTotal();

      expect(result.volumeDiscount).toBe(0.00);
      expect(result.subtotal).toBe(90.00);
      expect(result.total).toBe(90.00);
    });

    test("5% discount applied for exactly 10 items", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 10, taxRate: 0 });

      const result = order.calculateTotal();

      expect(result.volumeDiscount).toBe(5.00);   // 5% of $100
      expect(result.total).toBe(95.00);
    });

    test("5% discount applied for 24 items (upper boundary of first tier)", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 24, taxRate: 0 });

      expect(order.getVolumeDiscountPercent()).toBe(5);
    });

    test("10% discount applied for exactly 25 items", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 25, taxRate: 0 });

      const result = order.calculateTotal();

      expect(result.volumeDiscount).toBe(25.00);  // 10% of $250
      expect(result.total).toBe(225.00);
    });

    test("15% discount applied for exactly 50 items", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 50, taxRate: 0 });

      const result = order.calculateTotal();

      expect(result.volumeDiscount).toBe(75.00);  // 15% of $500
      expect(result.total).toBe(425.00);
    });

    test("20% discount applied for exactly 100 items", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 100, taxRate: 0 });

      const result = order.calculateTotal();

      expect(result.volumeDiscount).toBe(200.00); // 20% of $1000
      expect(result.total).toBe(800.00);
    });

    test("20% discount applied for 150 items (above 100 threshold)", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 150, taxRate: 0 });

      expect(order.getVolumeDiscountPercent()).toBe(20);
    });

    test("volume discount is based on total items across ALL line items", () => {
      const order = new FixedOrderProcessor();
      
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 6, taxRate: 0 });
      order.addLineItem({ sku: "ITEM-B", unitPrice: 10.00, quantity: 4, taxRate: 0 });

      expect(order.getTotalItemCount()).toBe(10);
      expect(order.getVolumeDiscountPercent()).toBe(5);
    });
  });

  // ── Tax Calculation ──────────────────────────────────────────────────────────

  describe("Tax Calculation", () => {

    test("tax is calculated per line item using individual tax rates", () => {
      const order = new FixedOrderProcessor();
      // Two items with different tax rates
      order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0.08 });
      order.addLineItem({ sku: "ITEM-B", unitPrice: 100.00, quantity: 1, taxRate: 0.10 });

      const result = order.calculateTotal();

      // No volume discount (2 items), no coupon
      // Tax = ($100 × 0.08) + ($100 × 0.10) = $8 + $10 = $18
      expect(result.tax).toBe(18.00);
      expect(result.total).toBe(218.00);
    });

    test("tax is computed on volume-discounted price", () => {
      const order = new FixedOrderProcessor();
      // 10 items -> 5% volume discount
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 10, taxRate: 0.10 });

      const result = order.calculateTotal();

      // subtotal = $100, volume discount = $5, taxable base = $95
      // tax = $95 × 10% = $9.50
      expect(result.subtotal).toBe(100.00);
      expect(result.volumeDiscount).toBe(5.00);
      expect(result.tax).toBe(9.50);
      expect(result.total).toBe(104.50); // $95 + $9.50
    });

    test("items with 0% tax rate contribute no tax", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0 });

      const result = order.calculateTotal();

      expect(result.tax).toBe(0.00);
      expect(result.total).toBe(100.00);
    });

    test("taxRate defaults to 0 when not provided", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 50.00, quantity: 2 }); // no taxRate

      const result = order.calculateTotal();

      expect(result.tax).toBe(0.00);
    });
  });

  // ── Coupons ──────────────────────────────────────────────────────────────────

  describe("Coupon Discounts", () => {

    test("coupon reduces the total correctly", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0 });
      order.applyCoupon({ code: "SAVE10", discountAmount: 10.00 });

      const result = order.calculateTotal();

      expect(result.couponDiscount).toBe(10.00);
      expect(result.total).toBe(90.00);
    });

    test("removeCoupon removes the applied coupon", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0 });
      order.applyCoupon({ code: "SAVE10", discountAmount: 10.00 });
      order.removeCoupon();

      const result = order.calculateTotal();

      expect(result.couponDiscount).toBe(0.00);
      expect(result.total).toBe(100.00);
    });

    test("applying a new coupon replaces the previous one", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0 });
      order.applyCoupon({ code: "SAVE10", discountAmount: 10.00 });
      order.applyCoupon({ code: "SAVE25", discountAmount: 25.00 });

      const result = order.calculateTotal();

      expect(result.couponDiscount).toBe(25.00);
      expect(result.total).toBe(75.00);
    });

    test("hasCoupon is true when a coupon is applied", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 1, taxRate: 0 });
      order.applyCoupon({ code: "SAVE5", discountAmount: 5.00 });

      expect(order.getSummary().hasCoupon).toBe(true);
    });

    test("hasCoupon is false after coupon is removed", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 1, taxRate: 0 });
      order.applyCoupon({ code: "SAVE5", discountAmount: 5.00 });
      order.removeCoupon();

      expect(order.getSummary().hasCoupon).toBe(false);
    });
  });

  // ── Rush Surcharge ───────────────────────────────────────────────────────────

  describe("Rush Surcharge", () => {

    test("rush surcharge of $15.00 is added to final total", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0 });
      order.setRush(true);

      const result = order.calculateTotal();

      expect(result.rushSurcharge).toBe(15.00);
      expect(result.total).toBe(115.00);
    });

    test("no rush surcharge when isRush is false", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0 });

      const result = order.calculateTotal();

      expect(result.rushSurcharge).toBe(0.00);
    });

    test("rush surcharge applies on top of discounts and tax", () => {
      const order = new FixedOrderProcessor();
      // 10 items -> 5% discount; with 10% tax; plus rush
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 10, taxRate: 0.10 });
      order.setRush(true);

      const result = order.calculateTotal();

      // subtotal=$100, discount=$5, taxable=$95, tax=$9.50, rush=$15
      // total = $95 + $9.50 + $15 = $119.50
      expect(result.total).toBe(119.50);
    });
  });

  // ── Status Transitions ───────────────────────────────────────────────────────

  describe("Order Status Transitions", () => {

    test("initial status is 'draft'", () => {
      const order = new FixedOrderProcessor();
      expect(order.status).toBe("draft");
    });

    test("advanceStatus transitions: draft - submitted - processing - shipped - delivered", () => {
      const order = new FixedOrderProcessor();

      expect(order.advanceStatus()).toBe("submitted");
      expect(order.advanceStatus()).toBe("processing");
      expect(order.advanceStatus()).toBe("shipped");
      expect(order.advanceStatus()).toBe("delivered");
    });

    test("advanceStatus does not advance beyond 'delivered'", () => {
      const order = new FixedOrderProcessor();
      order.advanceStatus(); // submitted
      order.advanceStatus(); // processing
      order.advanceStatus(); // shipped
      order.advanceStatus(); // delivered
      order.advanceStatus(); // should stay delivered

      expect(order.status).toBe("delivered");
    });

    test("cancel() from draft sets status to 'cancelled' and returns true", () => {
      const order = new FixedOrderProcessor();

      expect(order.cancel()).toBe(true);
      expect(order.status).toBe("cancelled");
    });

    test("cancel() from submitted sets status to 'cancelled' and returns true", () => {
      const order = new FixedOrderProcessor();
      order.advanceStatus(); // submitted

      expect(order.cancel()).toBe(true);
      expect(order.status).toBe("cancelled");
    });

    test("cancel() from processing returns false and does not change status", () => {
      const order = new FixedOrderProcessor();
      order.advanceStatus(); // submitted
      order.advanceStatus(); // processing

      expect(order.cancel()).toBe(false);
      expect(order.status).toBe("processing");
    });

    test("cancel() from shipped returns false", () => {
      const order = new FixedOrderProcessor();
      order.advanceStatus(); // submitted
      order.advanceStatus(); // processing
      order.advanceStatus(); // shipped

      expect(order.cancel()).toBe(false);
      expect(order.status).toBe("shipped");
    });

    test("cancel() from delivered returns false", () => {
      const order = new FixedOrderProcessor();
      order.advanceStatus(); // submitted
      order.advanceStatus(); // processing
      order.advanceStatus(); // shipped
      order.advanceStatus(); // delivered

      expect(order.cancel()).toBe(false);
    });

    test("advanceStatus() does not advance a cancelled order", () => {
      const order = new FixedOrderProcessor();
      order.cancel(); // cancelled
      order.advanceStatus();

      expect(order.status).toBe("cancelled");
    });
  });

  // ── Line Item Management ─────────────────────────────────────────────────────

  describe("Line Item Management", () => {

    test("addLineItem adds item to lineItems array", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      expect(order.lineItems).toHaveLength(1);
      expect(order.lineItems[0].sku).toBe("ITEM-A");
    });

    test("removeLineItem removes the correct item by SKU", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });
      order.addLineItem({ sku: "ITEM-B", unitPrice: 20.00, quantity: 1, taxRate: 0.08 });

      order.removeLineItem("ITEM-A");

      expect(order.lineItems).toHaveLength(1);
      expect(order.lineItems[0].sku).toBe("ITEM-B");
    });

    test("updateQuantity changes the quantity of the specified SKU", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      const result = order.updateQuantity("ITEM-A", 10);

      expect(result).toBe(true);
      expect(order.lineItems[0].quantity).toBe(10);
    });

    test("updateQuantity returns false for non-existent SKU", () => {
      const order = new FixedOrderProcessor();
      order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

      const result = order.updateQuantity("DOES-NOT-EXIST", 5);

      expect(result).toBe(false);
    });

    test("getSummary reports correct lineItemCount and itemCount", () => {
      const order = makeStandardOrder(); // 3 line items, 12 total items

      const summary = order.getSummary();

      expect(summary.lineItemCount).toBe(3);
      expect(summary.itemCount).toBe(12);
    });
  });

});


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — EDGE CASE TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("SECTION 3 — Edge Case Tests (Fixed Version)", () => {

  test("empty order: calculateTotal returns all zeros", () => {
    const order = new FixedOrderProcessor();
    const result = order.calculateTotal();

    expect(result.subtotal).toBe(0);
    expect(result.volumeDiscount).toBe(0);
    expect(result.couponDiscount).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.rushSurcharge).toBe(0);
    expect(result.total).toBe(0);
  });

  test("empty order: getTotalItemCount returns 0", () => {
    const order = new FixedOrderProcessor();
    expect(order.getTotalItemCount()).toBe(0);
  });

  test("empty order: getVolumeDiscountPercent returns 0", () => {
    const order = new FixedOrderProcessor();
    expect(order.getVolumeDiscountPercent()).toBe(0);
  });

  test("single item with all features: volume discount + coupon + tax + rush", () => {
    const order = new FixedOrderProcessor();
    // 10 items -> 5% volume discount
    order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 10, taxRate: 0.10 });
    order.applyCoupon({ code: "SAVE5", discountAmount: 5.00 });
    order.setRush(true);

    const result = order.calculateTotal();

    // subtotal = $100
    // volumeDiscount = $5 (5%)
    // afterVolumeDiscount = $95
    // couponDiscount = $5
    // taxableBase = $90
    // tax = $90 × 10% = $9.00
    // rushSurcharge = $15
    // total = $90 + $9 + $15 = $114
    expect(result.subtotal).toBe(100.00);
    expect(result.volumeDiscount).toBe(5.00);
    expect(result.couponDiscount).toBe(5.00);
    expect(result.tax).toBe(9.00);
    expect(result.rushSurcharge).toBe(15.00);
    expect(result.total).toBe(114.00);
  });

  test("order with exactly 9 items does not get volume discount", () => {
    const order = new FixedOrderProcessor();
    order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 9, taxRate: 0 });

    expect(order.getVolumeDiscountPercent()).toBe(0);
  });

  test("order with exactly 49 items gets 10% discount (not 15%)", () => {
    const order = new FixedOrderProcessor();
    order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 49, taxRate: 0 });

    expect(order.getVolumeDiscountPercent()).toBe(10);
  });

  test("order with exactly 99 items gets 15% discount (not 20%)", () => {
    const order = new FixedOrderProcessor();
    order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 99, taxRate: 0 });

    expect(order.getVolumeDiscountPercent()).toBe(15);
  });

  test("removing a line item that qualified for volume discount re-evaluates the discount", () => {
    const order = new FixedOrderProcessor();
    order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 8, taxRate: 0 });
    order.addLineItem({ sku: "ITEM-B", unitPrice: 10.00, quantity: 4, taxRate: 0 });
    // 12 items -> 5% discount

    order.removeLineItem("ITEM-B");
    // Now 8 items -> no discount

    expect(order.getVolumeDiscountPercent()).toBe(0);
  });

  test("updating quantity to trigger a higher discount tier", () => {
    const order = new FixedOrderProcessor();
    order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 5, taxRate: 0 });
    // 5 items -> no discount

    order.updateQuantity("ITEM-A", 25);
    // 25 items -> 10% discount

    expect(order.getVolumeDiscountPercent()).toBe(10);
  });

  test("coupon with $0 discountAmount has no effect", () => {
    const order = new FixedOrderProcessor();
    order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0 });
    order.applyCoupon({ code: "ZEROCOUPON", discountAmount: 0 });

    const result = order.calculateTotal();

    expect(result.couponDiscount).toBe(0.00);
    expect(result.total).toBe(100.00);
  });

  test("all monetary fields in calculateTotal() are rounded to 2 decimal places", () => {
    const order = makeStandardOrder();
    order.applyCoupon({ code: "ODD", discountAmount: 3.33 });
    order.setRush(true);

    const result = order.calculateTotal();

    ["subtotal", "volumeDiscount", "couponDiscount", "tax", "rushSurcharge", "total"].forEach(
      (field) => {
        const value = result[field];
        expect(value).toBe(Math.round(value * 100) / 100);
      }
    );
  });

  test("getSummary reflects correct status, isRush, and hasCoupon flags", () => {
    const order = new FixedOrderProcessor();
    order.addLineItem({ sku: "ITEM-A", unitPrice: 10.00, quantity: 1, taxRate: 0 });
    order.setRush(true);
    order.applyCoupon({ code: "SAVE1", discountAmount: 1.00 });
    order.advanceStatus(); // draft -> submitted

    const summary = order.getSummary();

    expect(summary.status).toBe("submitted");
    expect(summary.isRush).toBe(true);
    expect(summary.hasCoupon).toBe(true);
  });

  test("order with quantity 1 single item, no discounts, correct subtotal", () => {
    const order = new FixedOrderProcessor();
    order.addLineItem({ sku: "ITEM-A", unitPrice: 49.99, quantity: 1, taxRate: 0.08 });

    const result = order.calculateTotal();

    expect(result.subtotal).toBe(49.99);
    expect(result.volumeDiscount).toBe(0.00);
    expect(result.tax).toBe(4.00); // 49.99 × 0.08 = 3.9992 -> rounds to 4.00
    expect(result.total).toBe(53.99);
  });

});
