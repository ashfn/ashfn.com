// Basic source-level obfuscation. Browsers decode this normally without JS;
// HTML-aware scrapers can too, so this is not an anti-spam guarantee.
const address = [97, 102, 64, 97, 115, 104, 102, 110, 46, 99, 111, 109];
export const mailHref = 'mailto:' + String.fromCharCode(...address);
export function encodeMailAttributes(html: string) {
  return html.replace(/href="(mailto:[^"]+)"/g, (_, href: string) =>
    'href="' + [...href].map(char => `&#${char.charCodeAt(0)};`).join('') + '"');
}
