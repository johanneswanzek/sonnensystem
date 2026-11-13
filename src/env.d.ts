// Bauzeit-Konstanten aus vite.config.js (define)
declare const __TARGET__: 'site' | 'artifact';
declare const __SITE__:
  | { impressum: string; datenschutz: string; i18n: Record<string, { title?: string; description?: string }> }
  | undefined;
