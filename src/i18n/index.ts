import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { useSettingsStore } from "@/stores/settingsStore";
import enCommon from "@/i18n/en/common.json";
import enMenu from "@/i18n/en/menu.json";
import enSettings from "@/i18n/en/settings.json";
import enBattle from "@/i18n/en/battle.json";
import enContent from "@/i18n/en/content.json";
import ukCommon from "@/i18n/uk/common.json";
import ukMenu from "@/i18n/uk/menu.json";
import ukSettings from "@/i18n/uk/settings.json";
import ukBattle from "@/i18n/uk/battle.json";
import ukContent from "@/i18n/uk/content.json";
import ruCommon from "@/i18n/ru/common.json";
import ruMenu from "@/i18n/ru/menu.json";
import ruSettings from "@/i18n/ru/settings.json";
import ruBattle from "@/i18n/ru/battle.json";
import ruContent from "@/i18n/ru/content.json";

export const resources = {
  en: {
    common: enCommon,
    menu: enMenu,
    settings: enSettings,
    battle: enBattle,
    content: enContent,
  },
  uk: {
    common: ukCommon,
    menu: ukMenu,
    settings: ukSettings,
    battle: ukBattle,
    content: ukContent,
  },
  ru: {
    common: ruCommon,
    menu: ruMenu,
    settings: ruSettings,
    battle: ruBattle,
    content: ruContent,
  },
} as const;

export const initI18n = (): Promise<unknown> => {
  const ready = i18n.use(initReactI18next).init({
    resources,
    lng: useSettingsStore.getState().locale,
    fallbackLng: "en",
    ns: ["common", "menu", "settings", "battle", "content"],
    defaultNS: "common",
    interpolation: { escapeValue: false },
  });
  useSettingsStore.subscribe((state, prev) => {
    if (state.locale !== prev.locale) void i18n.changeLanguage(state.locale);
  });
  return ready;
};
