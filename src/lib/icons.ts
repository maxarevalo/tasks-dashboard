import {
  Wallet,
  ListChecks,
  LayoutDashboard,
  Briefcase,
  User,
  Construction,
  Receipt,
  CreditCard,
  Repeat,
  Landmark,
  BarChart3,
  Car,
  HeartPulse,
  Scale,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "wallet"
  | "list-checks"
  | "layout-dashboard"
  | "briefcase"
  | "user"
  | "construction"
  | "receipt"
  | "credit-card"
  | "repeat"
  | "landmark"
  | "bar-chart-3"
  | "car"
  | "heart-pulse"
  | "scale";

export const iconMap: Record<IconName, LucideIcon> = {
  wallet: Wallet,
  "list-checks": ListChecks,
  "layout-dashboard": LayoutDashboard,
  briefcase: Briefcase,
  user: User,
  construction: Construction,
  receipt: Receipt,
  "credit-card": CreditCard,
  repeat: Repeat,
  landmark: Landmark,
  "bar-chart-3": BarChart3,
  car: Car,
  "heart-pulse": HeartPulse,
  scale: Scale,
};
