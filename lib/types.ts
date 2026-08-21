export type PaymentMode = "none" | "deposit" | "full";

export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  duration_min: number;
  price_pln: number;
  sort_order: number;
  active: boolean;
  is_group: boolean;
  max_participants: number | null;
  payment_mode: PaymentMode;
  /** Only used when payment_mode = 'deposit'. Null → use price_pln as deposit. */
  deposit_amount_pln: number | null;
  /**
   * Lessons in a package sold for one price. Null for an ordinary service.
   * The length of one lesson is `duration_min` — a package does not get its
   * own duration field, because that is the number slot computation reads and
   * two of them would eventually disagree.
   */
  total_lessons: number | null;
};

export type BusinessHours = {
  day_of_week: number; // 0=Sun ... 6=Sat
  open_time: string | null; // "HH:MM:SS"
  close_time: string | null;
  closed: boolean;
};

export type BookingStatus = "confirmed" | "cancelled" | "completed" | "no_show" | "pending_payment";

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
  staff_id: string | null;
  /** Set when this booking is one lesson of a package. */
  package_id: string | null;
};
