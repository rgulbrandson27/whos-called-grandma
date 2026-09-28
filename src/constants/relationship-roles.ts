// Shared by the subscriber's own relationship picker (subscriber-roles.tsx)
// and the invitee's mini onboarding (join/[memberId].tsx).
export const ROLE_GROUPS = [
  { options: ["Son", "Daughter", "Child"], color: "#FFF1C7", selectedColor: "#F2DEA0" },
  { options: ["Grandson", "Granddaughter", "Grandchild"], color: "#DDEEDB", selectedColor: "#BEDCB9" },
  { options: ["Spouse", "Partner"], color: "#F5DFE8", selectedColor: "#E8BDCF" },
  { options: ["Brother", "Sister", "Sibling"], color: "#DDEAF7", selectedColor: "#BCD3EB" },
  { options: ["Niece", "Nephew", "Nibling"], color: "#F5E2D2", selectedColor: "#E8C5A9" },
  { options: ["Friend", "Neighbor"], color: "#DCEFEB", selectedColor: "#B9DDD4" },
  { options: ["Service Provider", "Other"], color: "#E5DFF2", selectedColor: "#CEC2E5" },
];

export const ROLES = ROLE_GROUPS.flatMap((group) => group.options);
