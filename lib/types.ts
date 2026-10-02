export type Team = {
  id: string; name: string;
  default_court_price: number; default_shuttle_price: number;
  qr_path: string | null;
};
export type Player = {
  id: string; team_id: string; name: string;
  phone: string | null; note: string | null;
};
export type Session = {
  id: string; team_id: string; played_on: string; location: string | null;
  court_price: number; shuttle_price: number; shuttle_count: number;
  note: string | null; is_paid: boolean; paid_at: string | null;
};
export type Meal = {
  id: string; team_id: string; eaten_on: string; title: string | null;
  total_amount: number; note: string | null; is_paid: boolean; paid_at: string | null;
};
