import JSZip from 'jszip';
import { BittyMetadata } from '../types';

/**
 * Ensures HTML has appropriate DOCTYPE, html lang, and head meta tags based on BittyMetadata
 */
export function enrichHtmlWithMetadata(rawContent: string, metadata: BittyMetadata): string {
  const title = metadata.title || 'Bitty Box Page';
  const desc = metadata.description || '';
  const author = metadata.author || '';
  const canonical = metadata.canonicalUrl || '';
  const lang = metadata.language || 'en';
  const favicon = metadata.favicon || '📦';

  // Build meta tags
  const metaTags: string[] = [];
  if (desc) metaTags.push(`  <meta name="description" content="${escapeHtmlAttr(desc)}">`);
  if (author) metaTags.push(`  <meta name="author" content="${escapeHtmlAttr(author)}">`);
  if (canonical) metaTags.push(`  <link rel="canonical" href="${escapeHtmlAttr(canonical)}">`);
  metaTags.push(`  <meta name="generator" content="Bitty Box (Zero-Server Protocol)">`);
  
  if (favicon) {
    if (favicon.startsWith('http') || favicon.startsWith('data:')) {
      metaTags.push(`  <link rel="icon" href="${escapeHtmlAttr(favicon)}">`);
    } else {
      // SVG emoji favicon
      const svgFavicon = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${favicon}</text></svg>`;
      metaTags.push(`  <link rel="icon" href="${svgFavicon}">`);
    }
  }

  // If already a full HTML document
  if (rawContent.includes('<html') || rawContent.includes('<!DOCTYPE') || rawContent.includes('<head>')) {
    let result = rawContent;
    
    // Check if lang is present in <html>
    if (result.includes('<html') && !result.includes('lang=')) {
      result = result.replace(/<html(\s*>|\s+[^>]*>)/i, `<html lang="${lang}"$1`);
    }

    // Insert meta tags into <head> if present
    if (result.includes('</head>')) {
      const injected = metaTags.join('\n') + '\n';
      result = result.replace('</head>', `${injected}</head>`);
    }

    // Ensure title exists or update if generic
    if (!result.includes('<title>') && result.includes('<head>')) {
      result = result.replace('<head>', `<head>\n  <title>${escapeHtmlAttr(title)}</title>`);
    }

    return result;
  }

  // Wrap partial content into complete HTML document
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlAttr(title)}</title>
${metaTags.join('\n')}
  <style>
    :root {
      color-scheme: dark;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 2rem;
      line-height: 1.6;
      background-color: #050515;
      color: #e0f2fe;
    }
  </style>
</head>
<body>
${rawContent}
</body>
</html>`;
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Packages the Bitty Box content into a portable ZIP archive containing index.html, metadata, and README
 */
export async function exportBittyToZip(
  content: string,
  metadata: BittyMetadata,
  bittyUrl?: string
): Promise<void> {
  const zip = new JSZip();

  const enrichedHtml = enrichHtmlWithMetadata(content, metadata);
  const safeFilenameTitle = (metadata.title || 'bitty-box')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'bitty-box';

  // 1. Add primary index.html
  zip.file('index.html', enrichedHtml);

  // 2. Add manifest.json
  const manifest = {
    title: metadata.title || 'Untitled Bitty Box',
    description: metadata.description || '',
    author: metadata.author || '',
    canonicalUrl: metadata.canonicalUrl || '',
    language: metadata.language || 'en',
    favicon: metadata.favicon || '📦',
    exportedAt: new Date().toISOString(),
    bittyProtocolVersion: '2.0-quantum',
    zeroServerUrl: bittyUrl || '',
  };
  zip.file('bitty-manifest.json', JSON.stringify(manifest, null, 2));

  // 3. Add README.md with instructions
  const readmeContent = `# ${metadata.title || 'Bitty Box Web Export'}

> **Zero-Server Micro-Site Package**  
> Generated with **Bitty Box Studio** at ${new Date().toLocaleString()}

${metadata.description ? `\n### Description\n${metadata.description}\n` : ''}
${metadata.author ? `- **Author:** ${metadata.author}\n` : ''}
${metadata.language ? `- **Language:** ${metadata.language}\n` : ''}
${metadata.canonicalUrl ? `- **Canonical URL:** ${metadata.canonicalUrl}\n` : ''}

---

## 🚀 How to Host & View

### 1. Instant Local Offline Viewing
Double click \`index.html\` to view this website in any web browser without an internet connection or web server.

### 2. Static Web Hosting (GitHub Pages, Cloudflare Pages, Netlify, Vercel)
Drop this folder or repository into any static web host:
- **GitHub Pages**: Push this directory to a repo and enable GitHub Pages in Settings &rarr; Pages.
- **Netlify / Vercel**: Drag & drop this unzipped folder into Netlify Drop or Vercel dashboard.
- **Cloudflare Pages**: Connect your repository or upload the directory.

### 3. Serverless Bitty URL Hash
${bittyUrl ? `This exact page is also compressed and encoded in this self-contained URL:\n\n\`${bittyUrl}\`\n\nNo servers or database needed!` : ''}

---
*Built with Bitty Box — The URL-Native Micro-Web Protocol*
`;

  zip.file('README.md', readmeContent);

  // Generate zip file Blob
  const blob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  // Trigger browser download
  const downloadUrl = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = downloadUrl;
  downloadAnchor.download = `${safeFilenameTitle}-bitty-export.zip`;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  document.body.removeChild(downloadAnchor);
  URL.revokeObjectURL(downloadUrl);
}
