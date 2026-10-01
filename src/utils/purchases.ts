import { setupStep, setupError } from "@/utils/setup-errors";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import type { PlanId } from "@/constants/plans";

// RevenueCat has no purchase mechanism on web — every call here is a no-op
// there, and the paywall skips straight to recording the plan.
const SUPPORTED = Platform.OS === "ios" || Platform.OS === "android";

// Call once, as early as possible (see src/app/_layout.tsx).
export function configurePurchases(): void {
  if (!SUPPORTED) return;
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  if (!apiKey) {
    console.warn(
      "RevenueCat API key missing (EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY) — purchases will fail until it's set in .env.",
    );
    return;
  }
  Purchases.configure({ apiKey });
}

// App Store Connect / Play Console product ids are permanent once created —
// prefixed so they can never collide with another app's products under the
// same developer account, even though circles.plan and every tier-derivation
// call site (e.g. plan.split("_")[0]) keep using the clean, unprefixed form.
// This is the only place that translation happens.
const STORE_PRODUCT_PREFIX = "wcg_";
const toStoreProductId = (planId: PlanId) => `${STORE_PRODUCT_PREFIX}${planId}`;

// Matches by the underlying store product identifier (e.g. "wcg_premium_annual"),
// not RevenueCat's own package identifier — that only works if the App Store
// Connect / Play Console product ids match toStoreProductId() exactly, which
// is why the RevenueCat setup instructions insist on that.
async function getPackageForPlan(planId: PlanId) {
  const storeProductId = toStoreProductId(planId);
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) {
    throw new Error("No current RevenueCat offering is configured.");
  }
  const pkg = current.availablePackages.find(
    (p) => p.product.identifier === storeProductId,
  );
  if (!pkg) {
    throw new Error(
      `No RevenueCat package found for "${storeProductId}" — check it's in the current offering and the product id matches exactly.`,
    );
  }
  return pkg;
}

export async function purchasePlan(
  planId: PlanId,
): Promise<{ success: boolean; cancelled?: boolean }> {
  if (!SUPPORTED) return { success: true };
  // Match the exact store product, so Basic never authorizes Premium and a
  // different billing selection is not silently recorded as purchased.
  const info = await setupStep("RevenueCat entitlement lookup", async () => {
    await Purchases.invalidateCustomerInfoCache();
    return Purchases.getCustomerInfo();
  });
  const productId = toStoreProductId(planId);
  const entitled = Object.values(info.entitlements.active)
    .some((entitlement) => entitlement.isActive && entitlement.productIdentifier === productId);
  if (entitled || info.activeSubscriptions.includes(productId)) {
    return { success: true };
  }
  const pkg = await setupStep("RevenueCat package lookup", () => getPackageForPlan(planId));
  try {
    await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (e) {
    // react-native-purchases attaches this flag rather than throwing a
    // distinct error type for "the user backed out of the purchase sheet".
    if (typeof e === "object" && e !== null && "userCancelled" in e && e.userCancelled) {
      return { success: false, cancelled: true };
    }
    throw setupError("RevenueCat purchase", e);
  }
}

export async function restorePurchases(): Promise<void> {
  if (!SUPPORTED) return;
  await Purchases.restorePurchases();
}
