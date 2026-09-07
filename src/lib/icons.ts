import {
  Wallet,
  ListChecks,
  LayoutDashboard,
  Briefcase,
  User,
  Construction,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "wallet"
  | "list-checks"
  | "layout-dashboard"
  | "briefcase"
  | "user"
  | "construction";

export const iconMap: Record<IconName, LucideIcon> = {
  wallet: Wallet,
  "list-checks": ListChecks,
  "layout-dashboard": LayoutDashboard,
  briefcase: Briefcase,
  user: User,
  construction: Construction,
};
