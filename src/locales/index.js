/**
 * Localization - centralized messages and static strings.
 * Usage: const { messages } = require('./locales');
 * Default: en (English). Add more locales (hi, etc.) and switch via LOCALE env for i18n.
 */
const en = require('./en');

const locales = { en };
const defaultLocale = process.env.LOCALE || 'en';
const messages = locales[defaultLocale] || en;

module.exports = { messages, locales };
