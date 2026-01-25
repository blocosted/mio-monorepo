/**
 * Mio UI Component Library
 *
 * Shared UI components for Mio applications.
 * Built with Radix UI primitives and styled with Tailwind CSS.
 */

// Utilities
export { cn } from './utils';

// Atoms
export {
  Button,
  buttonVariants,
  type ButtonProps,
  Input,
  type InputProps,
  Badge,
  badgeVariants,
  type BadgeProps,
  Skeleton,
  Avatar,
  avatarVariants,
  type AvatarProps,
  ThemeToggle,
  type ThemeToggleProps,
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator
} from './atoms';

// Molecules
export {
  SearchInput,
  type SearchInputProps,
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  Tabs,
  type Tab,
  type TabsProps,
  PageHeader,
  type PageHeaderProps
} from './molecules';

// Organisms
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  DataTable,
  type DataTableProps
} from './organisms';

// Layouts
export { AdminLayout, type AdminLayoutProps } from './layouts';
