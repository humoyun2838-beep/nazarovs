import {
  Activity,
  Ambulance,
  Archive,
  BadgeCheck,
  Banknote,
  BookOpen,
  Briefcase,
  BriefcaseMedical,
  ChartColumn,
  ChartLine,
  FileText,
  Heart,
  HeartPulse,
  Home,
  KeyRound,
  Microscope,
  Phone,
  Pill,
  SlidersHorizontal,
  Stethoscope,
  User,
  UserRound,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  "key-round": KeyRound,
  "file-text": FileText,
  stethoscope: Stethoscope,
  phone: Phone,
  activity: Activity,
  home: Home,
  ambulance: Ambulance,
  "briefcase-medical": BriefcaseMedical,
  "heart-pulse": HeartPulse,
  microscope: Microscope,
  "badge-check": BadgeCheck,
  briefcase: Briefcase,
  "chart-column": ChartColumn,
  pill: Pill,
  archive: Archive,
  wallet: Wallet,
  banknote: Banknote,
  "user-round": UserRound,
  heart: Heart,
  user: User,
  "chart-line": ChartLine,
  warehouse: Warehouse,
  "sliders-horizontal": SlidersHorizontal,
};

export type IconTone = {
  bg: string;
  fg: string;
  ring: string;
  glow: string;
};

const DEFAULT_TONE: IconTone = {
  bg: "#e8f1ff",
  fg: "#1d4ed8",
  ring: "#93c5fd",
  glow: "rgba(29, 78, 216, 0.28)",
};

const ICON_TONES: Record<string, IconTone> = {
  "book-open": { bg: "#eef2ff", fg: "#4338ca", ring: "#a5b4fc", glow: "rgba(67, 56, 202, 0.28)" },
  "key-round": { bg: "#eef2ff", fg: "#4338ca", ring: "#a5b4fc", glow: "rgba(67, 56, 202, 0.28)" },
  "file-text": DEFAULT_TONE,
  stethoscope: { bg: "#e0f2fe", fg: "#0369a1", ring: "#7dd3fc", glow: "rgba(3, 105, 161, 0.3)" },
  phone: { bg: "#ecfeff", fg: "#0e7490", ring: "#67e8f9", glow: "rgba(14, 116, 144, 0.28)" },
  activity: { bg: "#ccfbf1", fg: "#0f766e", ring: "#5eead4", glow: "rgba(15, 118, 110, 0.3)" },
  home: { bg: "#dcfce7", fg: "#15803d", ring: "#86efac", glow: "rgba(21, 128, 61, 0.3)" },
  ambulance: { bg: "#ffedd5", fg: "#c2410c", ring: "#fdba74", glow: "rgba(194, 65, 12, 0.32)" },
  "briefcase-medical": { bg: "#ede9fe", fg: "#6d28d9", ring: "#c4b5fd", glow: "rgba(109, 40, 217, 0.28)" },
  "heart-pulse": { bg: "#ffe4e6", fg: "#be123c", ring: "#fda4af", glow: "rgba(190, 18, 60, 0.3)" },
  microscope: { bg: "#e0f2fe", fg: "#075985", ring: "#7dd3fc", glow: "rgba(7, 89, 133, 0.3)" },
  "badge-check": { bg: "#dcfce7", fg: "#047857", ring: "#6ee7b7", glow: "rgba(4, 120, 87, 0.3)" },
  briefcase: { bg: "#e2e8f0", fg: "#334155", ring: "#94a3b8", glow: "rgba(51, 65, 85, 0.28)" },
  "chart-column": { bg: "#dbeafe", fg: "#1d4ed8", ring: "#93c5fd", glow: "rgba(29, 78, 216, 0.3)" },
  pill: { bg: "#fae8ff", fg: "#a21caf", ring: "#f0abfc", glow: "rgba(162, 28, 175, 0.28)" },
  archive: { bg: "#fef3c7", fg: "#b45309", ring: "#fcd34d", glow: "rgba(180, 83, 9, 0.3)" },
  wallet: { bg: "#ecfccb", fg: "#3f6212", ring: "#bef264", glow: "rgba(63, 98, 18, 0.28)" },
  banknote: { bg: "#d1fae5", fg: "#047857", ring: "#6ee7b7", glow: "rgba(4, 120, 87, 0.28)" },
  "user-round": { bg: "#e0e7ff", fg: "#3730a3", ring: "#a5b4fc", glow: "rgba(55, 48, 163, 0.28)" },
  heart: { bg: "#ffe4e6", fg: "#e11d48", ring: "#fda4af", glow: "rgba(225, 29, 72, 0.3)" },
  user: { bg: "#e0f2fe", fg: "#075985", ring: "#7dd3fc", glow: "rgba(7, 89, 133, 0.28)" },
  "chart-line": { bg: "#cffafe", fg: "#0e7490", ring: "#67e8f9", glow: "rgba(14, 116, 144, 0.28)" },
  warehouse: { bg: "#ffedd5", fg: "#c2410c", ring: "#fdba74", glow: "rgba(194, 65, 12, 0.28)" },
  "sliders-horizontal": { bg: "#dbeafe", fg: "#1e40af", ring: "#93c5fd", glow: "rgba(30, 64, 175, 0.28)" },
};

export function getIcon(name: string): LucideIcon {
  return ICONS[name] ?? FileText;
}

export function getIconTone(name: string): IconTone {
  return ICON_TONES[name] ?? DEFAULT_TONE;
}

export const ICON_OPTIONS = Object.keys(ICONS);
