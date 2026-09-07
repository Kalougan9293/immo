import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale, type Locale } from "./config";
import { getMessages, type Messages } from "./messages";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return parseLocale(jar.get(LOCALE_COOKIE)?.value);
}

export async function getDictionary(): Promise<{
  locale: Locale;
  messages: Messages;
}> {
  const locale = await getLocale();
  return { locale, messages: getMessages(locale) };
}
