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
  /**
   * Price is per head, not per booking: the total is `price_pln × participants`.
   * A workshop charges each child; a haircut charges the chair.
   */
  price_per_person: boolean;
  /** Fewest people the service will run for. Null → no minimum. */
  participants_min: number | null;
  /** What to call them on the form — "Liczba dzieci" rather than "Liczba osób". */
  participants_label: string | null;
  /** One extra short question this service needs answered, e.g. "Wiek dzieci". */
  extra_question_label: string | null;
  /** One question answered from a list, e.g. "Temat warsztatu". */
  extra_choice_label: string | null;
  /** What that list offers. Null when there is no such question. */
  extra_choices: string[] | null;
};

/**
 * A recurring meeting of a service: "Zajęcia 6–10 lat, poniedziałek 15:45".
 *
 * The service says what it is, how long it runs and what a month costs. The
 * group says when in the week it happens and how many people fit — the two
 * things a service cannot express, because one service has several of them.
 */
export type ClassGroup = {
  id: string;
  tenant_id: string;
  service_id: string;
  slug: string;
  /** 0 = niedziela … 6 = sobota. */
  day_of_week: number;
  /** "15:45:00" as Postgres returns it. */
  start_time: string;
  end_time: string;
  /** Below this the group is still forming; sign-ups are taken anyway. */
  min_participants: number | null;
  /** Null when the room decides, not the software. */
  max_participants: number | null;
  age_label: string | null;
  note: string | null;
  sort_order: number;
  active: boolean;
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
  /** How many people the booking is for, when the service is priced per head. */
  participants: number | null;
  /** Set when this booking is one meeting of a recurring group. */
  class_group_id: string | null;
};
