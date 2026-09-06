import {
  BookText,
  Bot,
  CheckCircle,
  CheckSquare,
  DatabaseZap,
  Download,
  Factory,
  FileText,
  KeyRound,
  Layers,
  LayoutTemplate,
  ListChecks,
  PanelLeft,
  PencilLine,
  Plus,
  RefreshCw,
  ScrollText,
  Settings,
  Shield,
  Store,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const menuIconMap: Record<string, LucideIcon> = {
  "book-text": BookText,
  bot: Bot,
  "check-circle": CheckCircle,
  "check-square": CheckSquare,
  "database-zap": DatabaseZap,
  download: Download,
  factory: Factory,
  "file-text": FileText,
  "key-round": KeyRound,
  layers: Layers,
  "layout-template": LayoutTemplate,
  "list-checks": ListChecks,
  "panel-left": PanelLeft,
  "pencil-line": PencilLine,
  plus: Plus,
  "refresh-cw": RefreshCw,
  "scroll-text": ScrollText,
  settings: Settings,
  shield: Shield,
  store: Store,
  "users-check": UserCheck,
  users: Users,
  wallet: Wallet,
};

export function iconForMenu(icon?: string | null): LucideIcon | undefined {
  if (!icon) {
    return undefined;
  }
  return menuIconMap[icon] ?? FileText;
}
