// The steps shown in the onboarding progress bar. This is the only place to
// edit it:
//  - add / remove / reorder a step by editing this list
//  - a step can cover several screens (`routes`); the bar advances when the
//    user reaches the first screen of the next step
//  - use \n in a label to force a line break (labels show on up to two lines)
//  - screens not listed anywhere simply show no progress
//  - "Get Started" has no screen of its own (the bar is hidden on /welcome), so
//    the first real page already shows it as complete: a deliberate head start
//  - to turn the whole bar off, set ONBOARDING_PROGRESS_ENABLED to false
//    (or unwrap <OnboardingProgressShell> in src/app/(onboarding)/_layout.tsx
//    and delete src/components/OnboardingProgress.tsx)
export const ONBOARDING_PROGRESS_ENABLED = true;

export const ONBOARDING_STEPS: { label: string; routes: string[] }[] = [
  { label: "Get\nStarted", routes: [] },
  { label: "Your\nLoved One", routes: ["/loved-one", "/loved-one-birthday"] },
  { label: "About\nYou", routes: ["/subscriber", "/subscriber-roles", "/subscriber-color"] },
  { label: "Create\nCircle", routes: ["/create-circle"] },
  { label: "Select\nPlan", routes: ["/paywall"] },
  { label: "Send\nInvites", routes: ["/member-invites", "/adding-members"] },
];
