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
    features: [
      "Up to 6 people in your circle",
      "Shared family calendar",
      "Simple check-in log",
    ],
  },
  premium: {
    label: "Premium",
    monthly: 5.99,
    annual: 35.99,
    annualDiscount: "Save 50%",
    features: [
      "Up to 20 people in your circle",
      "Shared family calendar",
      "Label how you connected (call, visit, etc.)",
      "Add a short note to a check-in",
    ],
  },
};

export const formatPrice = (amount: number) => `$${amount.toFixed(2)}`;
