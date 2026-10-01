export type MemberInviteStatus = "pending" | "accepted";

export type Member = {
  id: string;
  circleId: string;
  userId: string | null;
  name: string;
  phone: string | null;
  color: string | null;
  weekStart?: "sunday" | "monday";
  shape: string;
  role: string;
  inviteStatus: MemberInviteStatus;
  invitedAt: string;
  acceptedAt: string | null;
};

export type EventStatus = "planned" | "done";

export type CalendarEvent = {
  id: string;
  circleId: string;
  memberId: string;
  date: string; // 'YYYY-MM-DD'
  status: EventStatus;
  kind: string | null;
  notePreset: string | null;
  noteCustom: string | null;
};

export const members: Member[] = [
  {
    id: "m1",
    circleId: "c1",
    userId: "u1",
    name: "Raina",
    phone: "(555) 111-2222",
    color: "#E4572E",
    shape: "circle",
    role: "owner",
    inviteStatus: "accepted",
    invitedAt: "2026-09-01T00:00:00.000Z",
    acceptedAt: "2026-09-01T00:00:00.000Z",
  },
  {
    id: "m2",
    circleId: "c1",
    userId: "u2",
    name: "Bob",
    phone: "(555) 222-3333",
    color: "#3A86FF",
    shape: "circle",
    role: "member",
    inviteStatus: "accepted",
    invitedAt: "2026-09-02T00:00:00.000Z",
    acceptedAt: "2026-09-03T00:00:00.000Z",
  },
  {
    id: "m3",
    circleId: "c1",
    userId: "u3",
    name: "Anastacia",
    phone: "(555) 333-4444",
    color: "#8338EC",
    shape: "circle",
    role: "member",
    inviteStatus: "accepted",
    invitedAt: "2026-09-02T00:00:00.000Z",
    acceptedAt: "2026-09-04T00:00:00.000Z",
  },
];

export const events: CalendarEvent[] = [
  {
    id: "e1",
    circleId: "c1",
    memberId: "m1",
    date: "2026-09-19",
    status: "done",
    kind: null,
    notePreset: null,
    noteCustom: "Brought lunch",
  },
  {
    id: "e2",
    circleId: "c1",
    memberId: "m2",
    date: "2026-09-20",
    status: "planned",
    kind: null,
    notePreset: null,
    noteCustom: null,
  },
  {
    id: "e3",
    circleId: "c1",
    memberId: "m3",
    date: "2026-09-20",
    status: "planned",
    kind: null,
    notePreset: null,
    noteCustom: null,
  },
  {
    id: "e4",
    circleId: "c1",
    memberId: "m1",
    date: "2026-09-23",
    status: "done",
    kind: null,
    notePreset: null,
    noteCustom: "Took her outside",
  },
];
