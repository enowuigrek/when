import { redirect } from "next/navigation";

export default function WeekRedirect() {
  redirect("/admin/harmonogram?widok=tydzien");
}
