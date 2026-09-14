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
  | "car";

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
};
