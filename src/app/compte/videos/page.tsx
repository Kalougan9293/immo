import { redirect } from "next/navigation";

/** Ancienne route : les vidéos sont sur /compte */
export default function VideosRedirectPage() {
  redirect("/compte");
}
