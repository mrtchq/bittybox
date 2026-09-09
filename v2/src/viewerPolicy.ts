import type { CapsuleCapabilitySet } from './capsuleCore';

type ViewerCapabilities = Pick<CapsuleCapabilitySet, 'javascript' | 'network'>;

function originAllowlist(network: string[]): string[] {
  return [...new Set(network.map(value => {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new Error('Viewer network capabilities must use credential-free HTTP(S) origins');
    }
    return url.origin;
  }))].sort();
}

export function buildViewerCsp(capabilities: ViewerCapabilities): string {
  const origins = originAllowlist(capabilities.network);
  const scripts = capabilities.javascript ? "'unsafe-inline'" : "'none'";
  const network = origins.length ? origins.join(' ') : "'none'";

  return [
    "default-src 'none'",
    `script-src ${scripts}`,
    "style-src 'unsafe-inline'",
    `connect-src ${network}`,
    `img-src ${network}`,
    `media-src ${network}`,
    `font-src ${network}`,
    "frame-src 'none'",
    "worker-src 'none'",
    "object-src 'none'",
    "manifest-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "navigate-to 'none'",
  ].join('; ');
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>\"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  })[character] || character);
}

export function buildViewerDocument(
  payload: string,
  title: string,
  capabilities: ViewerCapabilities,
): string {
  const policy = escapeAttribute(buildViewerCsp(capabilities));
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
  const titleMarkup = `<title>${escapeAttribute(title)}</title>`;

  if (/<head(?:\s[^>]*)?>/i.test(payload)) {
    return payload.replace(/<head(?:\s[^>]*)?>/i, match => `${match}${meta}${titleMarkup}`);
  }
  return `<!doctype html><html><head>${meta}${titleMarkup}</head><body>${payload}</body></html>`;
}
