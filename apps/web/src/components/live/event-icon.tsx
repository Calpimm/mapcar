import {
  Award,
  Banknote,
  Briefcase,
  CarFront,
  Flag,
  Fuel,
  Home,
  type LucideIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Sparkles,
  Star,
  TriangleAlert,
  UtensilsCrossed,
  Wrench,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  depart: Navigation,
  arrive: MapPin,
  activity_start: MapPin,
  work_done: Banknote,
  meal: UtensilsCrossed,
  review: Star,
  refuel: Fuel,
  service: Wrench,
  car_bought: CarFront,
  promotion: Award,
  job_change: Briefcase,
  goal_new: Flag,
  goal_done: Sparkles,
  incident: TriangleAlert,
  rent: Home,
  thought: MessageCircle,
}

const TONE: Record<string, string> = {
  work_done: 'text-zeytin',
  promotion: 'text-narenciye',
  car_bought: 'text-narenciye',
  goal_done: 'text-narenciye',
  incident: 'text-kiraz',
  review: 'text-tas',
}

export function EventIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? MapPin
  return (
    <Icon className={`${TONE[type] ?? 'text-muted-foreground'} ${className ?? ''}`} aria-hidden />
  )
}

/** Öne çıkan (kutlanacak) olaylar */
export const HIGHLIGHT = new Set(['promotion', 'car_bought', 'goal_done', 'job_change'])
