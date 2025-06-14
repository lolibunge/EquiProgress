
import type { SVGProps } from 'react';
import {
  AlertTriangle, // Added AlertTriangle
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  Copy,
  Edit,
  ExternalLink,
  File,
  HelpCircle,
  Home,
  Loader2,
  Mail,
  MessageSquare,
  Moon,
  Plus,
  PlusCircle,
  Save,
  Search,
  Server,
  Settings,
  Share2,
  Shield,
  Sun,
  Trash,
  User,
  X,
  Workflow,
  PanelLeft,
  BookMarked,
  CalendarDays,
  BookOpen, // Added BookOpen
} from 'lucide-react';

const LogoIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 12h2"/>
    <path d="M6 6v.01"/>
    <path d="M10 3.5A1.5 1.5 0 0 1 8.5 2A1.5 1.5 0 0 1 7 3.5V5c0 .6.4 1 1 1h1.5c.6 0 1-.4 1-1V3.5Z"/>
    <path d="M18 6v.01"/>
    <path d="M22 12h-2"/>
    <path d="M17.5 3.5A1.5 1.5 0 0 0 16 2a1.5 1.5 0 0 0-1.5 1.5V5c0 .6.4 1 1 1H16c.6 0 1-.4 1-1V3.5Z"/>
    <path d="M6 18v.01"/>
    <path d="M18 18v.01"/>
    <path d="M8.7 15.8c1-.4 1.9-.8 2.6-1.3a2 2 0 0 0-2.6-3c-.9.5-1.7.9-2.6 1.3"/>
    <path d="m15.3 15.8c-1-.4-1.9-.8-2.6-1.3a2 2 0 0 1 2.6-3c.9.5 1.7.9 2.6 1.3"/>
    <path d="M12 22v-4"/>
    <path d="M6 12c0-1.5 1.2-2.8 2.7-3"/>
    <path d="M18 12c0-1.5-1.2-2.8-2.7-3"/>
  </svg>
);


const Icons = {
  alert: AlertTriangle, // Added AlertTriangle
  arrowRight: ArrowRight,
  check: Check,
  chevronDown: ChevronDown, 
  circle: Circle,
  workflow: Workflow,
  close: X,
  copy: Copy,
  dark: Moon,
  edit: Edit,
  externalLink: ExternalLink,
  file: File,
  help: HelpCircle,
  home: Home,
  light: Sun,
  loader: Loader2,
  mail: Mail,
  messageSquare: MessageSquare,
  plus: Plus,
  plusCircle: PlusCircle,
  save: Save,
  search: Search,
  server: Server,
  settings: Settings,
  share: Share2,
  shield: Shield,
  spinner: Loader2,
  trash: Trash, 
  user: User,
  panelLeft: PanelLeft,
  logo: LogoIcon,
  bookMarked: BookMarked,
  calendar: CalendarDays,
  bookOpen: BookOpen, // Added BookOpen
};

export {Icons};
