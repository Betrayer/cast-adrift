import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { useSettingsStore } from "@/stores/settingsStore";
import { LOCALES, type Locale } from "@/types";
import enCommon from "@/i18n/en/common.json";
import enMenu from "@/i18n/en/menu.json";
import enSettings from "@/i18n/en/settings.json";
import enBattle from "@/i18n/en/battle.json";
import enContent from "@/i18n/en/content.json";
import enRun from "@/i18n/en/run.json";
import enMeta from "@/i18n/en/meta.json";

export const NAMESPACES = [
  "common",
  "menu",
  "settings",
  "battle",
  "content",
  "run",
  "meta",
] as const;

export const EN_RESOURCES = {
  common: enCommon,
  menu: enMenu,
  settings: enSettings,
  battle: enBattle,
  content: enContent,
  run: enRun,
  meta: enMeta,
} as const;

// One language is 155 KB of JSON; seven of them bundled eagerly would be the
// whole performance budget (DESIGN §17). Only `en` ships in the main chunk as
// the i18next fallback — every other locale is a chunk fetched on demand.
type Loader = () => Promise<unknown>;

const files = import.meta.glob(["./*/*.json", "!./en/*.json"]) as Record<
  string,
  Loader
>;
const FILE_PATH = /^\.\/([a-z]{2})\/([a-z]+)\.json$/;

const loaders = new Map<string, Map<string, Loader>>();
for (const [path, load] of Object.entries(files)) {
  const match = FILE_PATH.exec(path);
  const locale = match?.[1];
  const namespace = match?.[2];
  if (locale === undefined || namespace === undefined) continue;
  if (locale === "en") continue;
  const bucket = loaders.get(locale) ?? new Map<string, Loader>();
  bucket.set(namespace, load);
  loaders.set(locale, bucket);
}

const isComplete = (locale: Locale): boolean =>
  locale === "en" || loaders.get(locale)?.size === NAMESPACES.length;

// The machine locales are generated artefacts (`npm run i18n:translate`). Until
// they exist the settings picker must not offer a language that would render as
// English, so availability is read off the file system at build time.
export const AVAILABLE_LOCALES: readonly Locale[] = LOCALES.filter(isComplete);

export const isAvailableLocale = (value: string): value is Locale =>
  AVAILABLE_LOCALES.includes(value as Locale);

const loaded = new Set<Locale>(["en"]);

export const loadLocale = async (locale: Locale): Promise<void> => {
  if (loaded.has(locale)) return;
  const bucket = loaders.get(locale);
  if (bucket === undefined) return;
  await Promise.all(
    NAMESPACES.map(async (namespace) => {
      const load = bucket.get(namespace);
      if (load === undefined) return;
      const module = (await load()) as { default: Record<string, unknown> };
      i18n.addResourceBundle(locale, namespace, module.default, true, true);
    }),
  );
  loaded.add(locale);
};

const resolveLocale = (value: Locale): Locale =>
  isComplete(value) ? value : "en";

export const initI18n = async (): Promise<void> => {
  const requested = resolveLocale(useSettingsStore.getState().locale);
  await i18n.use(initReactI18next).init({
    resources: { en: EN_RESOURCES },
    lng: "en",
    fallbackLng: "en",
    ns: [...NAMESPACES],
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });
  if (requested !== "en") {
    await loadLocale(requested);
    await i18n.changeLanguage(requested);
  }
  useSettingsStore.subscribe((state, prev) => {
    if (state.locale === prev.locale) return;
    const next = resolveLocale(state.locale);
    void loadLocale(next).then(() => i18n.changeLanguage(next));
  });
};
