export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  duration_min: number;
  price_pln: number;
  sort_order: number;
  active: boolean;
};

export type BusinessHours = {
  day_of_week: number; // 0=Sun ... 6=Sat
  open_time: string | null; // "HH:MM:SS"
  close_time: string | null;
  closed: boolean;
};

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "no_show";

export type Booking = {
  id: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
};
