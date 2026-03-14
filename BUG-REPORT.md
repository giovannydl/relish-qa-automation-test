# Bug Report — OrderProcessor

**Reviewed File:** `order-processor.js`  
**Reviewer:** Giovanny De León   
**Role:** Senior QA Engineer

---

## Discovery Process: How I Approached This?

In order to discover or find bugs on the code, I followed a structured analysis approach that includes:

1. **Read the business rules first:** Read the comment block at the top of the file is the specification, because every line of code must be validated against it.
2. **Traced execution mentally:** I followed the call chain, simulating what happens with real data.
3. **Looked for classic bug categories**: Bugs such as off-by-one errors, incorrect operator usage, wrong order of operations, missing boundary checks, and silent failures.
4. **Cross-validated the math:** I manually calculated what the correct output should be for a sample order, then traced what the code would actually produce, looking for divergence.

Following this process I identified 4 bugs: 1 runtime crash and 3 silent logic errors.These will be described below.

---

## Bug 1: Off-by-One Error in Loop Condition

| Property    | Detail                 |
|-------------|------------------------|
| **Method**  | `getTotalItemCount()` |
| **Line**    | 82                    |
| **Severity**| Critical 🔴           |

### Description
The `for` loop is using `i <= this.lineItems.length` as its condition instead of `i < this.lineItems.length`. JavaScript arrays are zero-indexed, so valid indices range from `0` to `length - 1`. Whith the current implementation, on the final iteration, when `i === this.lineItems.length`, `this.lineItems[i]` evaluates to `undefined`. Accessing `.quantity` on `undefined` throws a **TypeError at runtime**, crashing the entire order calculation pipeline.

This bug affects every single operation that depends on item count, which includes: `getVolumeDiscountPercent()`, `calculateTotal()`, and `getSummary()`.

### Why It's Critical
Any order with at least one line item will crash when trying to compute the total. This is the main happy path, so the system cannot process a single order successfully.

### How I Found It
During mental execution tracing: I followed `getSummary()` → `getTotalItemCount()` and simulated the loop iteration by iteration. When I reached to `i === lineItems.length`, I recognized the off-by-one pattern. The `<=` operator instead of `<` is one of the most common loop bugs in any language.

### Reproduction
```javascript
const order = new OrderProcessor();
order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 5, taxRate: 0.08 });

// This throws: TypeError: Cannot read properties of undefined (reading 'quantity')
order.getTotalItemCount();
```

### Fix
```javascript
for (let i = 0; i < this.lineItems.length; i++) {
```

---

## Bug 2: Coupon Does Not Reduce the Tax Base

| Property    | Detail                |
|-------------|-----------------------|
| **Method**  | `calculateTotal()`    |
| **Line**    | 110-125             |
| **Severity**| Major 🟠              |

### Description
The business rules explicitly mentions:

> *"Coupons provide a fixed-dollar discount applied **AFTER** volume discounts and **BEFORE** tax."*

This means tax must be calculated on the amount after both the volume discount and the coupon discount have been applied. However, the current implementation calculates tax inside a `forEach` loop that runs before the coupon is ever considered. As a result, the coupon discount never reduces the taxable base so the customer is taxed on a higher amount than they should be.

### Why It's Major
This produces silently wrong financial totals on every order that uses a coupon. The customer is overcharged on tax. This constitutes a financial calculation error that could have legal, compliance, and trust implications. It does not crash but it silently produces wrong numbers.


### How I Found It
After reading the business rules, I mapped the required order of operations:

```
subtotal
  → apply volume discount     → afterVolumeDiscount
  → apply coupon discount     → afterCouponDiscount   ← taxable base
  → calculate tax on that     → tax
  → add rush surcharge        → final total
```

Then I traced the actual code and found that `totalTax` is computed inside the `forEach` loop using only the volume-discounted price, and that the coupon subtraction happens after the loop in a separate block. The tax base and the coupon logic are disconnected.


### Reproduction
```javascript
const order = new OrderProcessor();
// Add 1 item, no volume discount triggered
order.addLineItem({ sku: "ITEM-A", unitPrice: 100.00, quantity: 1, taxRate: 0.10 });
order.applyCoupon({ code: "SAVE20", discountAmount: 20.00 });

const result = order.calculateTotal();

// Expected tax base: 100.00 - 20.00 = 80.00 → tax = 8.00
console.log(result.tax);   // 10 (wrong, should be 8.00)
console.log(result.total); // 90 (wrong, should be 88.00)
```

### Fix
Tax must be calculated after the coupon discount has been applied. The coupon discount needs to be distributed across line items proportionally, or the tax base must be computed as a whole after all pre-tax discounts are applied.

The cleanest approach would be to compute the total taxable base after all pre-tax discounts, then apply the effective per-item tax rate proportionally.

```javascript
// Correct order of operations inside calculateTotal():

// 1. Compute subtotal
let subtotal = 0;
this.lineItems.forEach(item => {
  subtotal += item.unitPrice * item.quantity;
});

// 2. Apply volume discount
const volumeDiscount = subtotal * (volumeDiscountPercent / 100);
let taxableBase = subtotal - volumeDiscount;

// 3. Apply coupon discount (BEFORE tax, per business rules)
let couponDiscount = 0;
if (this.coupon) {
  couponDiscount = Math.min(this.coupon.discountAmount, taxableBase); // clamp (see Bug #3)
  taxableBase -= couponDiscount;
}

// 4. Calculate tax on the correct taxable base per line item
// Distribute coupon reduction proportionally across line items
let totalTax = 0;
this.lineItems.forEach(item => {
  const lineSubtotal = item.unitPrice * item.quantity;
  const lineWeight = lineSubtotal / subtotal; // proportion of this line to total
  const lineTaxableAmount = taxableBase * lineWeight;
  totalTax += lineTaxableAmount * item.taxRate;
});
```

---

## Bug 3: Coupon Can Produce a Negative Total

| Property    | Detail                |
|-------------|-----------------------|
| **Method**  | `calculateTotal()`    |
| **Line**    | 122-125               |
| **Severity**| Major 🟠              |

### Description
When a coupon's `discountAmount` exceeds the order subtotal after volume discount, `afterVolumeDiscount` becomes negative. There is no restriction to prevent this. The result is a negative final total, which means the platform would calculate that the customer is owed money, which is clearly unintended behavior for a coupon mechanism.

### Why It's Major
In a financial system, a negative total could propagate to payment processing, invoicing, or accounting systems and cause real monetary damage. It is a predictable edge case that should be handled explicitly.

### How I Found It
After identifying the coupon logic block, I asked: *"What happens if the coupon value is larger than the order value?"* There is no guard condition anywhere. This is a classic boundary/edge case that is checked on this type of logic.

### Reproduction
```javascript
const order = new OrderProcessor();
order.addLineItem({ sku: "CHEAP-ITEM", unitPrice: 5.00, quantity: 1, taxRate: 0.08 });
order.applyCoupon({ code: "SUPER-DISCOUNT", discountAmount: 100.00 });

const result = order.calculateTotal();
console.log(result.total); // -95 (negative)
```

### Fix
Clamp `afterVolumeDiscount` to a minimum of `0` after applying the coupon:

```javascript
if (this.coupon) {
  couponDiscount = this.coupon.discountAmount;
  afterVolumeDiscount = Math.max(0, afterVolumeDiscount - couponDiscount);
  // Also adjust couponDiscount to the actual amount applied:
  couponDiscount = Math.min(couponDiscount, subtotal - volumeDiscount);
}
```

---

## Bug 4: Methods Silently Ignore Non-Existent SKUs

| Property    | Detail                               |
|-------------|--------------------------------------|
| **Method**  | `removeLineItem()`, `updateQuantity` |
| **Line**    | 41-43 and 48-53                      |
| **Severity**| Minor 🟡                             |

### Description
The method `removeLineItem(sku)` uses `Array.filter()` to remove an item by SKU. If the SKU does not exist in the order, the method silently does nothing and returns `undefined`. The caller has no way to know whether the removal was successful or whether they passed a wrong/misspelled SKU.

In this type of platform, a caller attempting to remove a line item that doesn't exist likely indicates a bug in the calling code. 

### Why It's Minor
This does not produce incorrect calculations or crashes on its own. However, it represents a defensive programming gap that can mask upstream bugs in a production system. Categorized as Minor because it requires a misuse of the API to manifest, but it should be fixed for robustness.

### How I Found It
I reviewed all mutation methods (`addLineItem`, `removeLineItem`, `updateQuantity`) and checked whether they validate their inputs and communicate outcomes to the caller. The methods `removeLineItem` and `updateQuantity` perform no validation and return nothing meaningful.

### Reproduction
```javascript
const order = new OrderProcessor();
order.addLineItem({ sku: "WIDGET-A", unitPrice: 10.00, quantity: 2, taxRate: 0.08 });

const result = order.removeLineItem("NON-EXISTENT-SKU");
console.log(result);           // undefined — no indication of failure
console.log(order.lineItems);  // still contains WIDGET-A — silent no-op
```

### Fix
Return a boolean indicating success, and optionally throw or warn on not-found:

```javascript
this.removeLineItem = function (sku) {
  const originalLength = this.lineItems.length;
  this.lineItems = this.lineItems.filter((item) => item.sku !== sku);
  return this.lineItems.length < originalLength; // true if removed, false if not found
};
```

The same pattern should be applied to `updateQuantity`:
```javascript
this.updateQuantity = function (sku, newQuantity) {
  const item = this.lineItems.find((item) => item.sku === sku);
  if (item) {
    item.quantity = newQuantity;
    return true;
  }
  return false; // SKU not found
};
```

---

## Summary Table

| # | Bug                                       | Method               | Type               | Severity    | Impact                                                     |
|---|-------------------------------------------|----------------------|--------------------|-------------|------------------------------------------------------------|
| 1 | Off-by-One Error in Loop Condition        | `getTotalItemCount`  | Off-by-one (crash) | Critical 🔴 | Crashes entire order pipeline on every use                  |
| 2 | Coupon Does Not Reduce the Tax Base       | `calculateTotal`     | Wrong order of ops | Major 🟠    | Tax overcharged on all coupon orders                        |
| 3 | Coupon Can Produce a Negative Total       | `calculateTotal`     | Missing clamp      | Major 🟠    | Negative totals when coupon is greater than the order value |
| 4 | Methods Silently Ignore Non-Existent SKUs | `removeLineItem`     | Silent failure     | Minor 🟡    | Masks upstream bugs, no feedback to caller                  |

---


