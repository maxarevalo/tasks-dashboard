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
  | "repeat";

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
};
