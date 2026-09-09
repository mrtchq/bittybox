import * as prettier from 'prettier/standalone';
import * as prettierPluginHtml from 'prettier/plugins/html';
import * as prettierPluginPostcss from 'prettier/plugins/postcss';
import * as prettierPluginBabel from 'prettier/plugins/babel';
import * as prettierPluginEstree from 'prettier/plugins/estree';

/**
 * Formats HTML, embedded CSS and JS using Prettier Standalone in the browser.
 */
export async function formatCode(source: string): Promise<string> {
  if (!source || !source.trim()) return source;

  try {
    const formatted = await prettier.format(source, {
      parser: 'html',
      plugins: [
        prettierPluginHtml,
        prettierPluginPostcss,
        prettierPluginBabel,
        prettierPluginEstree,
      ],
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      singleQuote: false,
      htmlWhitespaceSensitivity: 'css',
    });
    return formatted;
  } catch (err) {
    // If standard HTML parser fails (e.g. malformed fragment), try fallback basic indentation
    console.warn('Prettier formatting warning, using fallback format:', err);
    return fallbackFormatHtml(source);
  }
}

/**
 * Fallback tag-based formatting in case source contains severe unclosed fragment syntax
 */
function fallbackFormatHtml(html: string): string {
  let formatted = '';
  let indent = 0;
  const tab = '  ';

  // Split tags and clean
  const tokens = html.replace(/>\s*</g, '><').split(/(<[^>]+>)/g).filter(Boolean);

  for (const token of tokens) {
    if (token.startsWith('</')) {
      indent = Math.max(0, indent - 1);
      formatted += `${tab.repeat(indent)}${token}\n`;
    } else if (token.startsWith('<') && !token.endsWith('/>') && !token.startsWith('<!') && !isVoidTag(token)) {
      formatted += `${tab.repeat(indent)}${token}\n`;
      indent++;
    } else if (token.startsWith('<')) {
      formatted += `${tab.repeat(indent)}${token}\n`;
    } else {
      const trimmed = token.trim();
      if (trimmed) {
        formatted += `${tab.repeat(indent)}${trimmed}\n`;
      }
    }
  }

  return formatted.trim() || html;
}

function isVoidTag(tag: string): boolean {
  const match = tag.match(/^<([a-z0-9]+)/i);
  if (!match) return false;
  const name = match[1].toLowerCase();
  return ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'].includes(name);
}
