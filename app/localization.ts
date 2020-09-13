/* --------------------------------------------------------------------
  Set up the stuff handled by lingui
  ---------------------------------------------------------------------*/
import { setupI18n, I18n } from "@lingui/core";
import userSettings from "./UserSettings";
import { remote } from "electron";
import { t } from "@lingui/macro";
import moment from "moment";
import { FieldDefinition } from "./model/field/FieldDefinition";

const languages = ["en", "es", "fr", "ps", "ru", "pt-BR"];
export const catalogs = {};
export let currentUILanguage: string;
export let i18n: I18n;

export function initializeLocalization() {
  // messages.js are generated by ``yarn lingui-compile``
  languages.forEach(
    (code) => (catalogs[code] = require(`../locale/${code}/messages.js`))
  );

  currentUILanguage = userSettings.UILanguage;
  // if the language in the settings isn't one this version supports,
  // or if there was no setting for this and we have the default (empty string)
  if (languages.indexOf(currentUILanguage) < 0) {
    // See if their OS's language is one we support
    currentUILanguage = remote.app.getLocale();
    // Do we have a localization for that language? If not, the default is English.
    if (languages.indexOf(currentUILanguage) < 0) {
      currentUILanguage = "en";
    }
  }

  i18n = setupI18n({
    language: currentUILanguage,
    catalogs,
  }).use(currentUILanguage);

  moment.locale(currentUILanguage); // this is a global change
}

export function setUILanguage(code: string): void {
  currentUILanguage = code;
  i18n.use(code);
  userSettings.UILanguage = code;
  remote.getCurrentWindow().reload();
}

// This is for strings that are not part of react, e.g. menus. They use this i18n variable to do localization

/* --------------------------------------------------------------------
  Handle the l10n of various data files while we wait for lingui to 
  be able to handle non-code input.
  ---------------------------------------------------------------------*/
// I don't have a way of making the lingui-extract scanner scan our fields.json5, so I just extracted this csv manually,
// and it lives as a second file on Crowdin.com that has to be translated.
const fields = require("../locale/fields.csv");
const choices = require("../locale/choices.csv");
const roles = require("../locale/roles.csv");
const genres = require("../locale/genres.csv");
const accessProtocols = require("../locale/accessProtocols.csv");
const tips = require("../locale/tips.csv"); // tooltips and specialinfo

export function translateFileType(englishTypeName: string): string {
  switch (englishTypeName) {
    case "Project":
      return i18n._(t`Project`);
    case "Session":
      return i18n._(t`Session`);
    case "Person":
      return i18n._(t`Person`);
    case "Video":
      return i18n._(t`Video`);
    case "Image":
      return i18n._(t`Image`);
    case "Audio":
      return i18n._(t`Audio`);
    default:
      return englishTypeName; // e.g. "mp3"
  }
}

export function translateFieldLabel(fieldDef: FieldDefinition): string {
  if (fieldDef === undefined) {
    return "LABEL ERROR";
  }
  return getMatch(fields, fieldDef.englishLabel, "fields.csv");
}
export function translateTooltip(fieldDef: FieldDefinition): string {
  if (!fieldDef.tooltip) {
    return "";
  }
  return fieldDef.tooltip ? getMatch(tips, fieldDef.tooltip, "tips.csv") : "";
}

export function translateTooltipNotice(notice: string): string {
  return getMatch(tips, notice, "tips.csv");
}
export function translateSpecialInfo(fieldDef: FieldDefinition): string {
  if (!fieldDef.specialInfo) {
    return "";
  }
  return fieldDef.specialInfo
    ? getMatch(tips, fieldDef.specialInfo, "tips.csv")
    : "";
}
export function translateAccessProtocol(choice: string): string {
  return getMatch(accessProtocols, choice, "accessProtocols.csv");
}
export function translateChoice(choice: string, fieldName?: string): string {
  return getMatch(choices, choice, "choices.csv", fieldName);
}

export function translateRole(role: string) {
  return getMatch(roles, role, "roles.csv");
}

export function translateGenre(genre: string) {
  return getMatch(genres, genre, "genres.csv");
}
function getMatch(
  lines: any[],
  s: string,
  fileThatShouldHaveThis: string,
  fieldName?: string
): string {
  const match = lines.find((f) => f.En === s);

  if (currentUILanguage === "ps") {
    // do we have a column for english for this?
    if (match && match["En"]) return s + "✓";
    else {
      if (s && s.length > 0) {
        // at the moment we're not asking translators to take on translating country names, so we don't expect to find them in the locale/choices.csv file
        if (!fieldName || fieldName.toLowerCase().indexOf("country") < 0) {
          const forField = fieldName ? `for field ${fieldName}` : "";

          console.log(
            `TODO: Add \t"${s}"\t to locale/${fileThatShouldHaveThis} ${forField}`
          );
        }
        return "MISSING-" + s;
      }
    }
  }
  const key = toCsvLanguageKey();

  if (match && match[key]) {
    return match[key];
  }
  //console.log(`No ${currentUILanguage} translation for ${s}, "${s}"`);
  return s;
}
// in this csv, we have "En", "Es", etc. Not "en", "es"... which is what the po file-based things use
function toCsvLanguageKey() {
  return currentUILanguage.charAt(0).toUpperCase() + currentUILanguage.slice(1);
}
