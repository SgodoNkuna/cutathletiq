// All demo / mock data has been removed for the test build.
// This file remains only to provide the role/sport enums used by signup.

export type Role = "athlete" | "coach" | "physio" | "admin";

export const ROLES: { id: Role; label: string; emoji: string }[] = [
  { id: "athlete", label: "Athlete", emoji: "🏃" },
  { id: "coach", label: "Coach", emoji: "📋" },
  { id: "physio", label: "Physio", emoji: "🩺" },
  { id: "admin", label: "Admin", emoji: "🛡️" },
];

export const SPORTS = [
  "Rugby",
  "Football",
  "Netball",
  "Basketball",
  "Athletics",
  "Cricket",
  "Hockey",
  "Other",
] as const;
export type Sport = (typeof SPORTS)[number];

export type EventKind = "gym" | "physio" | "game" | "tournament" | "team" | "misc";
export const EVENT_KIND_META: Record<EventKind, { label: string; emoji: string; color: string }> = {
  gym: { label: "Gym", emoji: "🏋️", color: "bg-navy text-white" },
  physio: { label: "Physio", emoji: "🩺", color: "bg-success text-white" },
  game: { label: "Game", emoji: "🏉", color: "bg-destructive text-white" },
  tournament: { label: "Tourney", emoji: "🏆", color: "bg-gold text-navy-deep" },
  team: { label: "Team", emoji: "👥", color: "bg-navy/80 text-white" },
  misc: { label: "Misc", emoji: "📌", color: "bg-foreground/70 text-white" },
};
