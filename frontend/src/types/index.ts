export interface CompetitionDive {
  code: string;
  description: string;
  difficulty: number;
  award: number;
  round_place: number;
  scores: (number | null)[];
}

export interface CompetitionResult {
  meet_name: string;
  event_name: string;
  round_type: string;
  start_date: string;
  end_date: string;
  date: string;
  total_score: number;
  detail_href: string;
  dives: CompetitionDive[];
}

export interface TrainingDive {
  code: string;
  drillType: string;
  reps: string[];
  success: number;
  confidence: number;
}

export interface TrainingSession {
  date: string;
  dives: TrainingDive[];
  balks: number;
}

export interface TrainingData {
  sessions: TrainingSession[];
  totalDives: number;
  successRate: number;
}

export interface Diver {
  id: string;
  name: string;
  gender: "M" | "F";
  age: number;
  city_state: string;
  country: string;
  hs_grad_year: number;
  results: CompetitionResult[];
  training?: TrainingData;
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

export interface DiveCodeTrendData extends TrendData {
  difficulty: number;
}

export interface DiveEntry {
  DiveCode: string;
  DrillType: string;
  Board: string;
  Reps: string[];
  Success: string;
}

export interface DiveData {
  Name: string;
  Dives: DiveEntry[];
  comment?: string;
  rating?: "green" | "yellow" | "red";
  balks?: number;
}

export interface DiverProfileProps {
  diver: Diver;
}
