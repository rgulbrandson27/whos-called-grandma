export type PlanTier = "basic" | "premium";
export type PlanBilling = "monthly" | "annual";
// Also the value stored in circles.plan. There is no free plan.
export type PlanId = `${PlanTier}_${PlanBilling}`;

// Placeholder pricing — swap for real RevenueCat product prices once that's wired up.
export const TIERS: Record<
  PlanTier,
  {
    label: string;
    monthly: number;
    annual: number;
    annualDiscount: string;
    features: string[];
  }
> = {
  basic: {
    label: "Basic",
    monthly: 2.99,
    annual: 20.99,
    annualDiscount: "Save 40%",
    features: ["Up to 6 people in your circle"],
  },
  premium: {
    label: "Premium",
    monthly: 5.99,
    annual: 35.99,
    annualDiscount: "Save 50%",
    features: [
      "Everything in Basic",
      "Up to 20 people in your circle",
      "Add photos to check-ins",
      "Longer custom notes",
      "Customizable notification settings",
      "Notification frequency",
    ],
  },
};

export const formatPrice = (amount: number) => `$${amount.toFixed(2)}`;

// Rows of the "Compare plans" table under the plan picker on the paywall.
// A string shows as text; true / false show a check / an X.
export const COMPARISON_ROWS: { label: string; basic: string | boolean; premium: string | boolean }[] = [
  { label: "People in your circle", basic: "Up to 6", premium: "Up to 20" },
  { label: "Shared family calendar", basic: true, premium: true },
  { label: "Photos on check-ins", basic: false, premium: true },
  { label: "Longer custom notes", basic: false, premium: true },
  { label: "Custom notification settings", basic: false, premium: true },
  { label: "Notification frequency", basic: false, premium: true },
];
