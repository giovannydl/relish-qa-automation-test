/**
 * OrderProcessor - Handles order creation, pricing, and fulfillment status
 * for a B2B procurement platform.
 *
 * Business Rules:
 * - Orders contain line items, each with a unit price, quantity, and tax rate.
 * - Volume discounts apply based on total item count across the order:
 *     10-24 items  -> 5% discount
 *     25-49 items  -> 10% discount
 *     50-99 items  -> 15% discount
 *     100+ items   -> 20% discount
 * - Coupons provide a fixed-dollar discount applied AFTER volume discounts and BEFORE tax.
 * - Tax is calculated per line item: (discountedUnitPrice * quantity * taxRate).
 * - A "rush" order adds a flat $15.00 surcharge to the final total.
 * - Currency amounts should be rounded to 2 decimal places in the final total.
 */

function OrderProcessor() {
  this.lineItems = [];
  this.coupon = null;
  this.isRush = false;
  this.status = "draft";

  /**
   * Adds a line item to the order.
   * @param {Object} item - { sku: string, unitPrice: number, quantity: number, taxRate: number }
   * taxRate is a decimal (e.g., 0.08 for 8%)
   */
  this.addLineItem = function (item) {
    this.lineItems.push({
      sku: item.sku,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      taxRate: item.taxRate || 0,
    });
  };

  /**
   * Removes a line item by SKU.
   */
  this.removeLineItem = function (sku) {
    this.lineItems = this.lineItems.filter((item) => item.sku !== sku);
  };

  /**
   * Updates the quantity of an existing line item.
   */
  this.updateQuantity = function (sku, newQuantity) {
    const item = this.lineItems.find((item) => item.sku === sku);
    if (item) {
      item.quantity = newQuantity;
    }
  };

  /**
   * Applies a coupon to the order.
   * @param {Object} coupon - { code: string, discountAmount: number }
   */
  this.applyCoupon = function (coupon) {
    this.coupon = coupon;
  };

  /**
   * Removes the currently applied coupon.
   */
  this.removeCoupon = function () {
    this.coupon = null;
  };

  /**
   * Marks the order as a rush order.
   */
  this.setRush = function (isRush) {
    this.isRush = isRush;
  };

  /**
   * Returns the total number of items in the order.
   */
  this.getTotalItemCount = function () {
    let count = 0;
    for (let i = 0; i <= this.lineItems.length; i++) {
      count += this.lineItems[i].quantity;
    }
    return count;
  };

  /**
   * Calculates the volume discount percentage based on total item count.
   */
  this.getVolumeDiscountPercent = function () {
    const count = this.getTotalItemCount();
    if (count >= 100) return 20;
    if (count >= 50) return 15;
    if (count >= 25) return 10;
    if (count >= 10) return 5;
    return 0;
  };

  /**
   * Calculates the order summary with subtotal, discounts, tax, and final total.
   * @returns {Object} { subtotal, volumeDiscount, couponDiscount, tax, rushSurcharge, total }
   */
  this.calculateTotal = function () {
    const volumeDiscountPercent = this.getVolumeDiscountPercent();

    let subtotal = 0;
    let totalTax = 0;

    this.lineItems.forEach((item) => {
      const lineSubtotal = item.unitPrice * item.quantity;
      subtotal += lineSubtotal;

      const discountedLineSubtotal = lineSubtotal * (1 - volumeDiscountPercent / 100);
      totalTax += discountedLineSubtotal * item.taxRate;
    });

    const volumeDiscount = subtotal * (volumeDiscountPercent / 100);
    let afterVolumeDiscount = subtotal - volumeDiscount;

    let couponDiscount = 0;
    if (this.coupon) {
      couponDiscount = this.coupon.discountAmount;
      afterVolumeDiscount = afterVolumeDiscount - couponDiscount;
    }

    let rushSurcharge = 0;
    if (this.isRush) {
      rushSurcharge = 15.0;
    }

    const total = afterVolumeDiscount + totalTax + rushSurcharge;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      volumeDiscount: Math.round(volumeDiscount * 100) / 100,
      couponDiscount: Math.round(couponDiscount * 100) / 100,
      tax: Math.round(totalTax * 100) / 100,
      rushSurcharge: rushSurcharge,
      total: Math.round(total * 100) / 100,
    };
  };

  /**
   * Transitions the order to the next status.
   * Valid transitions: draft -> submitted -> processing -> shipped -> delivered
   * An order can also go to "cancelled" from draft or submitted.
   */
  this.advanceStatus = function () {
    const transitions = {
      draft: "submitted",
      submitted: "processing",
      processing: "shipped",
      shipped: "delivered",
    };
    if (transitions[this.status]) {
      this.status = transitions[this.status];
      return this.status;
    }
    return this.status;
  };

  /**
   * Cancels the order (only from draft or submitted).
   */
  this.cancel = function () {
    if (this.status === "draft" || this.status === "submitted") {
      this.status = "cancelled";
      return true;
    }
    return false;
  };

  /**
   * Returns a summary object for the order.
   */
  this.getSummary = function () {
    const totals = this.calculateTotal();
    return {
      itemCount: this.getTotalItemCount(),
      lineItemCount: this.lineItems.length,
      status: this.status,
      isRush: this.isRush,
      hasCoupon: this.coupon != null,
      ...totals,
    };
  };
}

/*
    Usage example of the OrderProcessor object and its elements
*/

// Create a new order and add line items
let order = new OrderProcessor();
order.addLineItem({ sku: "WIDGET-A", unitPrice: 12.99, quantity: 5, taxRate: 0.08 });
order.addLineItem({ sku: "WIDGET-B", unitPrice: 24.50, quantity: 3, taxRate: 0.08 });
order.addLineItem({ sku: "GADGET-X", unitPrice: 7.25, quantity: 4, taxRate: 0.10 });

// Print summary (12 items total, should get 5% volume discount)
console.log("Order summary:", order.getSummary());

// Apply a coupon
order.applyCoupon({ code: "SAVE5", discountAmount: 5.00 });
console.log("After coupon:", order.calculateTotal());

// Mark as rush
order.setRush(true);
console.log("Rush order:", order.calculateTotal());

// Advance status
order.advanceStatus();
console.log("Status:", order.status);