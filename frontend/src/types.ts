// TypeScript interfaces

export interface Dive {
  dive_round: string;
  code: string;
  description: string;
  height?: string;
  difficulty: number;
  scores: (number | null)[];
  net_total: number;
  award: number;
  round_place: number;
}

export interface Result {
  meet_name: string;
  event_name: string;
  round_type: string;
  dive_count: number;
  total_score: number;
  detail_href?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  dives: Dive[];
}

export interface Diver {
  id: number;
  name: string;
  city_state: string;
  country: string;
  gender: "M" | "F";
  age: number;
  fina_age: number;
  hs_grad_year: number;
  results: Result[];
}

export interface DiverStats {
  totalDives: number;
  averageScore: number;
  bestScore: number;
  competitions: number;
  favoriteEvent: string;
  averageDifficulty: number;
  recentTrend: "up" | "down" | "stable";
}

export interface TrendData {
  date: string;
  score: number;
  competition: string;
}

export interface DiverProfileProps {
  diver: Diver;
}

export interface DiveCodeTrendData {
  date: string;
  score: number;
  competition: string;
  difficulty: number;
}

export interface NavItem {
  name: string;
  to: string;
  icon: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<React.SVGProps<SVGSVGElement>> &
      React.RefAttributes<SVGSVGElement>
  >;
}
