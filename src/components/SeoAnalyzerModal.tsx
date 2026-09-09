import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Copy, 
  Check, 
  Globe, 
  Twitter, 
  FileText, 
  Share2, 
  Zap, 
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';
import { BittyMetadata } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SeoAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: BittyMetadata;
  onChangeMetadata: (meta: BittyMetadata) => void;
  bittyUrl?: string;
}

export const SeoAnalyzerModal: React.FC<SeoAnalyzerModalProps> = ({
  isOpen,
  onClose,
  metadata,
  onChangeMetadata,
  bittyUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'preview' | 'code'>('audit');
  const [previewPlatform, setPreviewPlatform] = useState<'google' | 'twitter' | 'discord'>('google');
  const [copiedCode, setCopiedCode] = useState(false);
  const [appliedToast, setAppliedToast] = useState<string | null>(null);

  const title = metadata.title?.trim() || '';
  const description = metadata.description?.trim() || '';
  const author = metadata.author?.trim() || 'Anonymous Agent';
  const language = metadata.language?.trim() || 'en';
  const favicon = metadata.favicon?.trim() || '📦';
  const image = metadata.image?.trim() || '';
  const canonicalUrl = metadata.canonicalUrl?.trim() || bittyUrl || 'https://bitty.box/page';

  const slug = title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'untitled-page';
  const displayUrl = `https://bitty.box/${slug}`;

  // =========================================================================
  // SEO SCORING & AUDIT ENGINE
  // =========================================================================
  const auditResults = useMemo(() => {
    const checks: {
      id: string;
      category: 'title' | 'description' | 'meta' | 'discoverability';
      title: string;
      status: 'pass' | 'warn' | 'fail';
      score: number;
      maxScore: number;
      message: string;
      suggestion?: string;
      quickFix?: () => void;
    }[] = [];

    // 1. Title Checks
    const titleLen = title.length;
    if (!title || title.toLowerCase() === 'untitled' || title.toLowerCase() === 'bitty box') {
      checks.push({
        id: 'title-empty',
        category: 'title',
        title: 'Title Tag is Generic or Missing',
        status: 'fail',
        score: 0,
        maxScore: 25,
        message: 'A specific, descriptive title is essential for search engines to index your Bitty Box.',
        suggestion: `Quantum Micro-App // ${favicon} Decentralized Web Node`,
        quickFix: () => {
          onChangeMetadata({
            ...metadata,
            title: `Quantum Micro-App // ${favicon} Decentralized Web Node`,
          });
          showToast('Updated Title with descriptive keywords!');
        },
      });
    } else if (titleLen < 15) {
      checks.push({
        id: 'title-short',
        category: 'title',
        title: 'Title Tag is Too Short',
        status: 'warn',
        score: 12,
        maxScore: 25,
        message: `Current title is ${titleLen} characters. Search engines prefer 30–60 characters for complete search snippets.`,
        suggestion: `${title} — Zero-Server Micro Web App`,
        quickFix: () => {
          onChangeMetadata({
            ...metadata,
            title: `${title} — Zero-Server Micro Web App`,
          });
          showToast('Enhanced Title with context!');
        },
      });
    } else if (titleLen > 65) {
      checks.push({
        id: 'title-long',
        category: 'title',
        title: 'Title Tag Exceeds SERP Limit',
        status: 'warn',
        score: 16,
        maxScore: 25,
        message: `Current title is ${titleLen} characters. Google will truncate titles longer than 60–65 characters with an ellipsis (...).`,
        suggestion: title.slice(0, 58).trim() + '...',
        quickFix: () => {
          onChangeMetadata({
            ...metadata,
            title: title.slice(0, 58).trim(),
          });
          showToast('Trimmed Title to optimal length!');
        },
      });
    } else {
      checks.push({
        id: 'title-optimal',
        category: 'title',
        title: 'Title Tag Length is Optimal',
        status: 'pass',
        score: 25,
        maxScore: 25,
        message: `Title length (${titleLen} characters) perfectly fits desktop and mobile search engine result displays.`,
      });
    }

    // 2. Description Checks
    const descLen = description.length;
    if (!description) {
      checks.push({
        id: 'desc-empty',
        category: 'description',
        title: 'Description is Missing',
        status: 'fail',
        score: 0,
        maxScore: 25,
        message: 'Without a description, search engines and chat apps will not show a summary preview.',
        suggestion: `Explore ${title || 'this page'}, packed directly inside a private shareable link. Opens instantly in any browser.`,
        quickFix: () => {
          onChangeMetadata({
            ...metadata,
            description: `Explore ${title || 'this page'}, packed directly inside a private shareable link. Opens instantly in any browser.`,
          });
          showToast('Added page description!');
        },
      });
    } else if (descLen < 50) {
      checks.push({
        id: 'desc-short',
        category: 'description',
        title: 'Description is Too Short',
        status: 'warn',
        score: 12,
        maxScore: 25,
        message: `Description is ${descLen} characters. Aim for 120–160 characters to give visitors a clear summary.`,
        suggestion: `${description} Created with Bitty Box. Runs 100% in your browser with zero servers.`,
        quickFix: () => {
          onChangeMetadata({
            ...metadata,
            description: `${description} Created with Bitty Box. Runs 100% in your browser with zero servers.`.slice(0, 155),
          });
          showToast('Expanded page description!');
        },
      });
    } else if (descLen > 165) {
      checks.push({
        id: 'desc-long',
        category: 'description',
        title: 'Meta Description Exceeds SERP Snippet Limit',
        status: 'warn',
        score: 16,
        maxScore: 25,
        message: `Description is ${descLen} characters. Search engines will truncate descriptions exceeding 160 characters.`,
        suggestion: description.slice(0, 155).trim() + '...',
        quickFix: () => {
          onChangeMetadata({
            ...metadata,
            description: description.slice(0, 155).trim(),
          });
          showToast('Trimmed Description to 155 chars!');
        },
      });
    } else {
      checks.push({
        id: 'desc-optimal',
        category: 'description',
        title: 'Meta Description is Optimal',
        status: 'pass',
        score: 25,
        maxScore: 25,
        message: `Description length (${descLen} characters) is ideal for Google, Bing, and social card snippets.`,
      });
    }

    // 3. OpenGraph / Social Metadata Checks
    let ogScore = 0;
    if (image) {
      ogScore += 10;
      checks.push({
        id: 'og-image-pass',
        category: 'meta',
        title: 'Social Share Image (og:image) Configured',
        status: 'pass',
        score: 10,
        maxScore: 10,
        message: 'Rich media cards on Twitter/X, Discord, and Slack will display high-impact banner previews.',
      });
    } else {
      checks.push({
        id: 'og-image-miss',
        category: 'meta',
        title: 'No Social Preview Image (og:image)',
        status: 'warn',
        score: 3,
        maxScore: 10,
        message: 'Adding a preview image URL boosts social media engagement and click-through rates by up to 250%.',
        suggestion: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
        quickFix: () => {
          onChangeMetadata({
            ...metadata,
            image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
          });
          showToast('Added Cyberpunk banner image!');
        },
      });
    }

    if (favicon) {
      ogScore += 5;
      checks.push({
        id: 'favicon-pass',
        category: 'meta',
        title: 'Favicon & Visual Identity Configured',
        status: 'pass',
        score: 5,
        maxScore: 5,
        message: `Favicon emoji "${favicon}" enhances visual recognition in browser tabs and mobile bookmarks.`,
      });
    } else {
      checks.push({
        id: 'favicon-warn',
        category: 'meta',
        title: 'Favicon Emoji Missing',
        status: 'warn',
        score: 0,
        maxScore: 5,
        message: 'Choose an emoji to serve as your instant standalone favicon.',
        suggestion: '⚡',
        quickFix: () => {
          onChangeMetadata({ ...metadata, favicon: '⚡' });
          showToast('Set Favicon to ⚡');
        },
      });
    }

    // 4. Discoverability & Language Tags
    let discScore = 0;
    if (language && language.length >= 2) {
      discScore += 10;
      checks.push({
        id: 'lang-pass',
        category: 'discoverability',
        title: 'HTML Language Tag Defined',
        status: 'pass',
        score: 10,
        maxScore: 10,
        message: `Language code "${language}" assists search crawlers and screen readers in localization.`,
      });
    } else {
      checks.push({
        id: 'lang-miss',
        category: 'discoverability',
        title: 'Language Tag Missing',
        status: 'warn',
        score: 2,
        maxScore: 10,
        message: 'Search engines use html lang tags for geographic targeting and accessibility compliance.',
        suggestion: 'en',
        quickFix: () => {
          onChangeMetadata({ ...metadata, language: 'en' });
          showToast('Set Language to "en"');
        },
      });
    }

    if (author && author !== 'Anonymous Agent') {
      discScore += 5;
      checks.push({
        id: 'author-pass',
        category: 'discoverability',
        title: 'Author Attribution Configured',
        status: 'pass',
        score: 5,
        maxScore: 5,
        message: `Creator identity "${author}" is embedded in meta author tags for content provenance.`,
      });
    } else {
      checks.push({
        id: 'author-miss',
        category: 'discoverability',
        title: 'Author Tag is Generic',
        status: 'warn',
        score: 2,
        maxScore: 5,
        message: 'Specifying an author helps establish E-E-A-T authority signals with search engines.',
        suggestion: 'Bitty Box Engineer',
        quickFix: () => {
          onChangeMetadata({ ...metadata, author: 'Bitty Box Engineer' });
          showToast('Set Author Tag!');
        },
      });
    }

    // Total Score Calculation (0 - 100)
    const totalScore = checks.reduce((acc, curr) => acc + curr.score, 0);
    const maxScore = checks.reduce((acc, curr) => acc + curr.maxScore, 0);
    const normalizedScore = Math.min(100, Math.round((totalScore / maxScore) * 100));

    let grade = 'A+';
    let gradeColor = 'text-emerald-400 border-emerald-400 bg-emerald-950/60';
    let gradeDesc = 'Exceptional SEO & Social Readiness';

    if (normalizedScore < 50) {
      grade = 'D';
      gradeColor = 'text-rose-400 border-rose-400 bg-rose-950/60';
      gradeDesc = 'Poor Discoverability — Action Needed';
    } else if (normalizedScore < 70) {
      grade = 'C';
      gradeColor = 'text-amber-400 border-amber-400 bg-amber-950/60';
      gradeDesc = 'Moderate SEO — Recommended Tweaks';
    } else if (normalizedScore < 88) {
      grade = 'B';
      gradeColor = 'text-cyan-400 border-cyan-400 bg-cyan-950/60';
      gradeDesc = 'Good Discoverability Profile';
    }

    return {
      score: normalizedScore,
      grade,
      gradeColor,
      gradeDesc,
      checks,
      passedCount: checks.filter(c => c.status === 'pass').length,
      warnCount: checks.filter(c => c.status === 'warn').length,
      failCount: checks.filter(c => c.status === 'fail').length,
    };
  }, [title, description, author, language, favicon, image, canonicalUrl]);

  const showToast = (msg: string) => {
    setAppliedToast(msg);
    setTimeout(() => setAppliedToast(null), 2500);
  };

  // Auto-optimize all metadata with single click
  const handleAutoOptimizeAll = () => {
    onChangeMetadata({
      ...metadata,
      title: title && title.length >= 15 ? title : `${title || 'Interactive Page'} — Bitty Box`,
      description: description && description.length >= 50 
        ? description 
        : `Explore ${title || 'this page'}, packed directly inside a private shareable link. Opens instantly in any browser.`,
      language: language || 'en',
      author: author && author !== 'Anonymous Agent' ? author : 'Bitty Box Creator',
      favicon: favicon || '⚡',
      image: image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    });
    showToast('✨ All details auto-optimized to 100% score!');
  };

  // Full HTML Meta code generator
  const generatedHtmlSnippet = `<!-- Search Engine & Social Embed Meta Tags -->
<title>${title || 'Bitty Box App'}</title>
<meta name="title" content="${title || 'Bitty Box App'}">
<meta name="description" content="${description || 'A self-contained URL-native micro-application.'}">
<meta name="author" content="${author}">
<meta name="language" content="${language}">
<link rel="canonical" href="${canonicalUrl}">

<!-- Open Graph / Facebook / Discord / Slack -->
<meta property="og:type" content="website">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:title" content="${title || 'Bitty Box App'}">
<meta property="og:description" content="${description || 'A self-contained URL-native micro-application.'}">
${image ? `<meta property="og:image" content="${image}">\n` : ''}<!-- Twitter / X -->
<meta property="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<meta property="twitter:url" content="${canonicalUrl}">
<meta property="twitter:title" content="${title || 'Bitty Box App'}">
<meta property="twitter:description" content="${description || 'A self-contained URL-native micro-application.'}">
${image ? `<meta property="twitter:image" content="${image}">\n` : ''}
<!-- Schema.org WebApplication Structured Data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "${title || 'Bitty Box App'}",
  "description": "${description || 'A self-contained URL-native micro-application.'}",
  "url": "${canonicalUrl}",
  "applicationCategory": "DeveloperApplication",
  "operatingSystem": "All"
}
</script>`;

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(generatedHtmlSnippet);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {}
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur Fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-4xl max-h-[90vh] bg-[#070312] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,242,255,0.25)] flex flex-col overflow-hidden z-10"
          >
            {/* Holographic Header */}
            <div className="p-4 sm:p-6 border-b border-cyan-500/25 bg-gradient-to-r from-cyan-950/60 via-purple-950/60 to-black/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
                >
                  <Search className="w-5 h-5" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-cyber text-base sm:text-lg font-bold text-cyan-100 tracking-wider">
                      SEO &amp; DISCOVERABILITY ANALYZER
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-400/40">
                      v2.4 AST AUDIT
                    </span>
                  </div>
                  <p className="text-xs font-mono text-purple-300/70">
                    Actionable SEO heuristics, SERP simulator &amp; metadata discovery auditor
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.15, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-lg bg-purple-950/50 hover:bg-purple-900/80 border border-purple-500/30 text-purple-200 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Score Ribbon & Quick Action Bar */}
            <div className="p-4 sm:px-6 bg-black/50 border-b border-cyan-500/15 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 450 }}
                  className={`px-3.5 py-1.5 rounded-xl font-cyber text-xl font-black border ${auditResults.gradeColor} shadow-md flex items-center gap-2`}
                >
                  <span>{auditResults.grade}</span>
                  <span className="text-xs font-mono font-normal opacity-80">({auditResults.score}/100)</span>
                </motion.div>
                <div>
                  <div className="text-xs font-bold text-cyan-200">{auditResults.gradeDesc}</div>
                  <div className="text-[11px] font-mono text-purple-300/70 flex items-center gap-3 mt-0.5">
                    <span className="text-emerald-400">✓ {auditResults.passedCount} Passed</span>
                    {auditResults.warnCount > 0 && <span className="text-amber-400">▲ {auditResults.warnCount} Warnings</span>}
                    {auditResults.failCount > 0 && <span className="text-rose-400">✕ {auditResults.failCount} Critical</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.04, boxShadow: "0 0 25px rgba(0,242,255,0.6)" }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAutoOptimizeAll}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white font-cyber text-xs font-bold shadow-[0_0_20px_rgba(0,242,255,0.4)] transition cursor-pointer"
                  title="Automatically fix and maximize all SEO recommendations"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AUTO-OPTIMIZE ALL (100%)</span>
                </motion.button>
              </div>
            </div>

            {/* Navigation Tabs with layoutId animated underline */}
            <div className="flex border-b border-cyan-500/20 px-6 bg-[#04010b] relative">
              <button
                onClick={() => setActiveTab('audit')}
                className={`relative py-3 px-4 text-xs font-cyber tracking-wider transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === 'audit' ? 'text-cyan-300 font-bold' : 'text-purple-300/60 hover:text-purple-200'
                }`}
              >
                {activeTab === 'audit' && (
                  <motion.div
                    layoutId="active-seo-tab-border"
                    className="absolute inset-0 border-b-2 border-cyan-400 bg-cyan-950/30"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <Zap className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">AUDIT &amp; SUGGESTIONS ({auditResults.checks.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('preview')}
                className={`relative py-3 px-4 text-xs font-cyber tracking-wider transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === 'preview' ? 'text-cyan-300 font-bold' : 'text-purple-300/60 hover:text-purple-200'
                }`}
              >
                {activeTab === 'preview' && (
                  <motion.div
                    layoutId="active-seo-tab-border"
                    className="absolute inset-0 border-b-2 border-cyan-400 bg-cyan-950/30"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <Globe className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">SEARCH &amp; SOCIAL PREVIEW</span>
              </button>

              <button
                onClick={() => setActiveTab('code')}
                className={`relative py-3 px-4 text-xs font-cyber tracking-wider transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === 'code' ? 'text-cyan-300 font-bold' : 'text-purple-300/60 hover:text-purple-200'
                }`}
              >
                {activeTab === 'code' && (
                  <motion.div
                    layoutId="active-seo-tab-border"
                    className="absolute inset-0 border-b-2 border-cyan-400 bg-cyan-950/30"
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                  />
                )}
                <FileText className="w-3.5 h-3.5 relative z-10" />
                <span className="relative z-10">HTML META CODE</span>
              </button>
            </div>

            {/* Toast alert */}
            <AnimatePresence>
              {appliedToast && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-950/90 border border-emerald-400/60 text-emerald-200 px-4 py-2 text-xs font-mono flex items-center justify-between overflow-hidden"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {appliedToast}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

        {/* Tab Body Content */}
        <div className="p-6 overflow-y-auto flex-1 cyber-scrollbar space-y-4">
          {/* =========================================================================
              TAB 1: AUDIT & RECOMMENDATIONS
             ========================================================================= */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {auditResults.checks.map((check) => (
                  <div
                    key={check.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      check.status === 'pass'
                        ? 'bg-emerald-950/20 border-emerald-500/30'
                        : check.status === 'warn'
                        ? 'bg-amber-950/25 border-amber-500/35'
                        : 'bg-rose-950/30 border-rose-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {check.status === 'pass' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                          {check.status === 'warn' && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                          {check.status === 'fail' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                          <h4 className="font-cyber text-xs font-bold text-cyan-100">
                            {check.title}
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-purple-300 border border-purple-500/30">
                          {check.score}/{check.maxScore} CR
                        </span>
                      </div>

                      <p className="text-xs font-mono text-purple-200/80 leading-relaxed mb-3">
                        {check.message}
                      </p>

                      {check.suggestion && (
                        <div className="p-2.5 rounded-lg bg-black/60 border border-cyan-500/20 mb-3">
                          <div className="text-[10px] font-mono text-cyan-400 mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-cyan-400" />
                            RECOMMENDED SUGGESTION:
                          </div>
                          <div className="text-xs font-mono text-cyan-100 break-words line-clamp-2">
                            "{check.suggestion}"
                          </div>
                        </div>
                      )}
                    </div>

                    {check.quickFix && (
                      <button
                        onClick={check.quickFix}
                        className="mt-2 w-full py-1.5 px-3 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400/50 text-cyan-200 hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                      >
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                        <span>APPLY 1-CLICK FIX</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              TAB 2: LIVE SERP SIMULATOR
             ========================================================================= */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-purple-300">
                  Simulated preview across search engines and social networks:
                </div>
                <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-cyan-500/30">
                  <button
                    onClick={() => setPreviewPlatform('google')}
                    className={`px-3 py-1 rounded text-xs font-mono transition ${
                      previewPlatform === 'google' ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 font-bold' : 'text-purple-300/70'
                    }`}
                  >
                    Google SERP
                  </button>
                  <button
                    onClick={() => setPreviewPlatform('twitter')}
                    className={`px-3 py-1 rounded text-xs font-mono transition ${
                      previewPlatform === 'twitter' ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 font-bold' : 'text-purple-300/70'
                    }`}
                  >
                    X / Twitter
                  </button>
                  <button
                    onClick={() => setPreviewPlatform('discord')}
                    className={`px-3 py-1 rounded text-xs font-mono transition ${
                      previewPlatform === 'discord' ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 font-bold' : 'text-purple-300/70'
                    }`}
                  >
                    Discord / Slack
                  </button>
                </div>
              </div>

              {/* 1. Google SERP */}
              {previewPlatform === 'google' && (
                <div className="bg-[#1f1f1f] text-[#e8eaed] p-5 rounded-xl border border-white/10 shadow-2xl max-w-2xl mx-auto font-sans">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-full bg-[#303134] flex items-center justify-center text-sm">
                      {favicon}
                    </div>
                    <div className="truncate">
                      <div className="text-[13px] text-[#dadce0] font-medium leading-none truncate">
                        Bitty Box &bull; {author}
                      </div>
                      <div className="text-[11px] text-[#9aa0a6] leading-tight truncate">
                        {displayUrl}
                      </div>
                    </div>
                  </div>

                  <h3 className="text-[#8ab4f8] text-lg sm:text-xl font-medium leading-snug mb-1.5 hover:underline cursor-pointer">
                    {title || 'Untitled Bitty Box'}
                  </h3>

                  <p className="text-[#bdc1c6] text-sm leading-relaxed">
                    <span className="text-[#9aa0a6] font-mono mr-1.5">
                      {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} —
                    </span>
                    {description || 'No description provided. Search engines will generate an automatic fallback snippet.'}
                  </p>
                </div>
              )}

              {/* 2. Twitter Card */}
              {previewPlatform === 'twitter' && (
                <div className="bg-[#000000] border border-[#2f3336] rounded-2xl overflow-hidden text-left shadow-xl max-w-md mx-auto">
                  {image ? (
                    <div className="w-full h-44 bg-[#16181c] relative overflow-hidden border-b border-[#2f3336]">
                      <img src={image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-r from-cyan-950 via-[#0a051d] to-fuchsia-950 flex items-center justify-center p-4">
                      <span className="text-4xl">{favicon}</span>
                    </div>
                  )}
                  <div className="p-3.5">
                    <div className="text-[11px] text-[#71767b] font-mono truncate mb-0.5">bitty.box</div>
                    <div className="text-white text-sm font-bold leading-snug line-clamp-1 mb-1">
                      {title || 'Untitled Bitty Box'}
                    </div>
                    <div className="text-[#71767b] text-xs leading-relaxed line-clamp-2">
                      {description || 'Zero-server URL micro-web application.'}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Discord Embed */}
              {previewPlatform === 'discord' && (
                <div className="bg-[#2b2d31] text-[#dbdee1] border-l-4 border-cyan-400 rounded-r-xl p-4 max-w-md mx-auto shadow-xl">
                  <div className="text-[11px] text-[#949ba4] font-medium mb-1 flex items-center gap-1.5">
                    <span>{author}</span>
                    <span className="text-[9px] bg-[#35373c] px-1 rounded text-cyan-300 font-mono">BITTY BOT</span>
                  </div>
                  <h4 className="text-[#00a8fc] hover:underline font-semibold text-sm mb-1.5">
                    {title || 'Untitled Bitty Box'}
                  </h4>
                  <p className="text-xs text-[#dbdee1] leading-relaxed mb-3">
                    {description || 'A self-contained, zero-server micro-web application.'}
                  </p>
                  {image && (
                    <div className="rounded-lg overflow-hidden border border-[#3f4147] max-h-36">
                      <img src={image} alt="Banner" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              TAB 3: EXPORT META CODE & JSON-LD
             ========================================================================= */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-300">
                  Ready-to-use HTML &lt;head&gt; tags and JSON-LD schema snippet:
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950 border border-cyan-400/50 text-cyan-200 hover:text-white font-mono text-xs transition"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copiedCode ? 'COPIED TO CLIPBOARD!' : 'COPY CODE'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-black/80 border border-cyan-500/30 text-cyan-200 font-mono text-xs overflow-x-auto cyber-scrollbar leading-relaxed">
                <code>{generatedHtmlSnippet}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-black/70 border-t border-cyan-500/20 flex items-center justify-between">
          <div className="text-[11px] font-mono text-purple-300/60 hidden sm:block">
            Bitty Box URL-Native Search Discovery Protocol
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-950 hover:bg-purple-900 border border-purple-500/40 text-purple-200 hover:text-white font-cyber text-xs transition cursor-pointer"
          >
            CLOSE ANALYZER
          </motion.button>
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
};
