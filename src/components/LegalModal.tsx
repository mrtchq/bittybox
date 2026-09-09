import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  ShieldCheck, 
  Lock, 
  Bot, 
  Mail, 
  Globe, 
  Cpu, 
  CheckCircle2, 
  ExternalLink,
  Scale,
  Zap,
  ServerOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type LegalTab = 'terms' | 'privacy';

interface LegalModalProps {
  isOpen: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialTab = 'terms',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<LegalTab>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop Blur Fade */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#02010a]/85 backdrop-blur-md transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-3xl my-auto bg-[#070316] border border-cyan-500/40 rounded-2xl shadow-[0_0_50px_rgba(0,242,255,0.25)] overflow-hidden z-10 flex flex-col max-h-[88vh]"
        >
          {/* Neon Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-2xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-fuchsia-400 rounded-bl-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-fuchsia-400 rounded-br-2xl pointer-events-none" />

          {/* Modal Header */}
          <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-cyan-500/20 bg-[#09041d]/90 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(0,242,255,0.3)]">
                {activeTab === 'terms' ? <Scale className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-cyber font-bold text-base sm:text-lg text-white tracking-wide">
                    {activeTab === 'terms' ? 'TERMS OF SERVICE' : 'PRIVACY POLICY'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-400/30 text-[10px] font-mono text-cyan-300">
                    AGENT-FIRST PLATFORM
                  </span>
                </div>
                <p className="text-[11px] font-mono text-cyan-400/60 mt-0.5">
                  Bitty Box Protocol &bull; Last Updated: August 2026
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-cyan-400/70 hover:text-white hover:bg-cyan-950/80 border border-transparent hover:border-cyan-500/30 transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="px-5 sm:px-8 py-2.5 bg-[#050212] border-b border-cyan-500/10 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-cyber font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/60 shadow-[0_0_12px_rgba(0,242,255,0.3)]'
                  : 'text-cyan-400/50 hover:text-cyan-300 border border-transparent'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>TERMS OF SERVICE</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-cyber font-bold tracking-wider transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/60 shadow-[0_0_12px_rgba(255,0,222,0.3)]'
                  : 'text-cyan-400/50 hover:text-fuchsia-300 border border-transparent'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>PRIVACY POLICY</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-5 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm font-mono text-purple-200/80 leading-relaxed custom-scrollbar">
            {activeTab === 'terms' ? (
              <>
                {/* Intro Callout */}
                <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-400/30 flex items-start gap-3">
                  <Bot className="w-5 h-5 text-cyan-300 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-cyber font-bold text-cyan-200 text-xs uppercase mb-1">
                      Agent-First Micro-Application Protocol
                    </h4>
                    <p className="text-xs text-cyan-300/80">
                      Bitty Box is engineered as a serverless, agent-first execution layer. AI agents and developers compile, encapsulate, and distribute interactive micro-apps directly via self-inflating URL fragments (<code className="text-cyan-200">#...</code>) and Model Context Protocol (MCP) toolchains with zero central database requirement.
                    </p>
                  </div>
                </div>

                {/* Section 1 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-cyan-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    1. Acceptance of Terms & Protocol Overview
                  </h3>
                  <p>
                    By accessing or using Bitty Box (including the web interface at <span className="text-cyan-300 font-bold">bittybox.org</span>, associated API endpoints, MCP tool integrations, or standalone URL capsules), you and any autonomous agents operating on your behalf agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the service.
                  </p>
                </div>

                {/* Section 2 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-cyan-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    2. Serverless Architecture & Payload Responsibility
                  </h3>
                  <p>
                    Bitty Box operates on a client-side architecture where capsule payloads (HTML, CSS, JavaScript, media, and data schemas) are compressed, encoded, and decrypted directly inside client web browsers via URL hash fragments. 
                  </p>
                  <p>
                    Because hash fragments are never transmitted to web servers per standard browser HTTP specifications, Bitty Box does not host, curate, inspect, or retain your capsule source code. You and your autonomous agents assume full responsibility for all payloads generated, shared, or executed through Bitty Box.
                  </p>
                </div>

                {/* Section 3 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-cyan-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    3. Autonomous Agent & API Token Usage
                  </h3>
                  <p>
                    Users integrating Bitty Box with autonomous AI agents, LLMs, MCP servers, or automated programmatic pipelines agree to:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-purple-200/70">
                    <li>Maintain secure custody of API keys, bearer tokens, and encryption passphrases.</li>
                    <li>Respect system rate limits and fair-use concurrency quotas.</li>
                    <li>Prevent recursive loops or malicious denial-of-service traffic directed at verification or link-shortening endpoints.</li>
                    <li>Ensure AI-generated code conforms to safety guidelines and does not execute unauthorized exploit payloads.</li>
                  </ul>
                </div>

                {/* Section 4 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-cyan-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    4. Prohibited Activities & Content Restrictions
                  </h3>
                  <p>
                    You agree not to use Bitty Box to create, package, or distribute capsules containing:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-purple-200/70">
                    <li>Malicious software, keystroke loggers, credential stealers, or phishing campaigns.</li>
                    <li>Unlawful, harassing, defamatory, or harmful content violating international laws.</li>
                    <li>Deceptive exploits intended to bypass browser sandbox boundaries or iframe security policies.</li>
                  </ul>
                </div>

                {/* Section 5 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-cyan-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    5. Intellectual Property & Code Ownership
                  </h3>
                  <p>
                    You and your AI agent workflows retain complete ownership and intellectual property rights over any code, text, designs, or assets encapsulated via Bitty Box. Bitty Box claims no proprietary rights or license over user capsule contents.
                  </p>
                </div>

                {/* Section 6 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-cyan-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    6. Disclaimer of Warranties & Limitation of Liability
                  </h3>
                  <p>
                    Bitty Box is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express or implied. Under no circumstances will Bitty Box, its maintainers, or affiliates be liable for direct, indirect, incidental, or consequential damages arising from the creation, execution, decompression, or sharing of any URL capsule or agent automated operation.
                  </p>
                </div>

                {/* Section 7 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-cyan-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    7. Contact & Support
                  </h3>
                  <p>
                    For inquiries regarding these Terms of Service or enterprise agent integrations, contact us at{' '}
                    <a
                      href="mailto:support@bittybox.org"
                      className="text-cyan-300 underline hover:text-white font-bold transition-colors"
                    >
                      support@bittybox.org
                    </a>.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Privacy Callout */}
                <div className="p-4 rounded-xl bg-fuchsia-950/30 border border-fuchsia-400/30 flex items-start gap-3">
                  <ServerOff className="w-5 h-5 text-fuchsia-300 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-cyber font-bold text-fuchsia-200 text-xs uppercase mb-1">
                      Zero-Server Payload Retention by Design
                    </h4>
                    <p className="text-xs text-fuchsia-300/80">
                      Bitty Box is built on an absolute zero-knowledge privacy foundation. When you or an AI agent compile an application capsule, the data is embedded solely into the URL hash fragment. Our servers never log, store, or view the code inside your links.
                    </p>
                  </div>
                </div>

                {/* Privacy Section 1 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-fuchsia-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                    1. Information We Do Not Collect
                  </h3>
                  <p>
                    Due to the mathematical and cryptographic structure of URL hash fragments (<code className="text-fuchsia-200">#...</code>):
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-purple-200/70">
                    <li><strong className="text-fuchsia-200">No Capsule Storage:</strong> We do not store, index, or inspect the HTML, JavaScript, CSS, or assets inside generated capsules.</li>
                    <li><strong className="text-fuchsia-200">No Key Interception:</strong> Client-side AES-256 encryption keys and passwords never leave your browser or AI agent runtime.</li>
                    <li><strong className="text-fuchsia-200">No Third-Party Ad Trackers:</strong> We do not embed ad network trackers, social analytics pixels, or sell user telemetry.</li>
                  </ul>
                </div>

                {/* Privacy Section 2 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-fuchsia-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                    2. Information We Collect for Accounts & Agent APIs
                  </h3>
                  <p>
                    When you opt into optional developer or agent services (e.g. Magic Link email authentication, API key generation, or credit balance tracking):
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-purple-200/70">
                    <li><strong className="text-fuchsia-200">Email Address:</strong> Used solely to send cryptographic magic login links and critical platform notifications.</li>
                    <li><strong className="text-fuchsia-200">API Tokens & Quota Logs:</strong> Token metadata, request counts, and credit transactions required to provision and enforce API quotas for agent workflows.</li>
                  </ul>
                </div>

                {/* Privacy Section 3 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-fuchsia-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                    3. Local Storage & Client Data Control
                  </h3>
                  <p>
                    Bitty Box utilizes your browser&apos;s local storage (<code className="text-cyan-300">localStorage</code> / <code className="text-cyan-300">sessionStorage</code>) exclusively to store your workspace theme, draft sessions, walkthrough status, and local box history for your convenience. You can purge this data at any time through your browser settings or using the in-app &quot;Clear All&quot; history feature.
                  </p>
                </div>

                {/* Privacy Section 4 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-fuchsia-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                    4. Autonomous AI Agent Workflows & MCP Privacy
                  </h3>
                  <p>
                    When using Bitty Box through AI coding assistants, MCP tool calls, or automated agents, all generated payloads and parameters remain isolated to the client agent session. We do not use your capsule data or agent interactions to train public AI models.
                  </p>
                </div>

                {/* Privacy Section 5 */}
                <div className="space-y-2">
                  <h3 className="font-cyber font-bold text-fuchsia-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                    5. Contact Regarding Privacy
                  </h3>
                  <p>
                    If you have questions about privacy or wish to request the deletion of your account records, please contact our privacy team at{' '}
                    <a
                      href="mailto:support@bittybox.org"
                      className="text-fuchsia-300 underline hover:text-white font-bold transition-colors"
                    >
                      support@bittybox.org
                    </a>.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 sm:px-8 py-3.5 bg-[#09041d]/90 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <a
              href="mailto:support@bittybox.org"
              className="flex items-center gap-2 text-xs font-mono text-cyan-300 hover:text-white transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>Contact Us: support@bittybox.org</span>
            </a>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-600 text-white font-cyber text-xs tracking-wider shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:brightness-110 transition cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
