import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X, Download, Copy, Check, Sparkles, QrCode as QrIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, url, title }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && canvasRef.current && url) {
      QRCode.toCanvas(
        canvasRef.current,
        url,
        {
          width: 320,
          margin: 2,
          color: {
            dark: '#00ddff',
            light: '#0c051e',
          },
          errorCorrectionLevel: 'M',
        },
        err => {
          if (!err && canvasRef.current) {
            setQrDataUrl(canvasRef.current.toDataURL('image/png'));
          }
        }
      );
    }
  }, [isOpen, url]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `bittybox-${title.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
    a.click();
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
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Pop-up Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-md bento-card-purple p-6 rounded-2xl border border-cyan-500/40 shadow-[0_0_50px_rgba(0,221,255,0.35)] z-10"
          >
            <div className="bento-corner-accent top-l" />
            <div className="bento-corner-accent top-r" />
            <div className="bento-corner-accent bot-l" />
            <div className="bento-corner-accent bot-r" />

            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.15, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-purple-300 hover:text-white hover:bg-purple-800/40 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </motion.button>

            <div className="text-center mb-5">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1, stiffness: 400, damping: 20 }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-400/50 mb-3 shadow-[0_0_20px_rgba(0,221,255,0.4)]"
              >
                <QrIcon className="w-6 h-6 text-cyan-300" />
              </motion.div>
              <h3 className="font-cyber text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400">
                HOLO QR TRANSMITTER
              </h3>
              <p className="text-xs text-cyan-200/70 font-mono mt-1 truncate max-w-xs mx-auto">
                {title || 'Untitled Bitty Box'}
              </p>
            </div>

            {/* QR Code Canvas with Animated Laser Scanline */}
            <div className="relative overflow-hidden flex justify-center p-4 bg-[#090314] rounded-xl border border-cyan-500/30 shadow-[inset_0_0_20px_rgba(0,221,255,0.15)] mb-5">
              <canvas ref={canvasRef} className="rounded-lg max-w-full" />
              {/* Laser Scanline Beam */}
              <motion.div
                initial={{ top: '0%' }}
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-75 shadow-[0_0_12px_rgba(0,242,255,1)] pointer-events-none"
              />
            </div>

            {/* Byte and URL info */}
            <div className="bg-purple-950/40 border border-purple-500/20 rounded-lg p-2.5 mb-5 text-center">
              <div className="text-[11px] font-mono text-purple-300/80">
                URL LENGTH: <span className="text-cyan-300 font-bold">{url.length} BYTES</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30 hover:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all text-xs font-cyber cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-teal-300 animate-bounce" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'COPIED!' : 'COPY URL'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-400/40 text-fuchsia-200 hover:bg-fuchsia-500/30 hover:shadow-[0_0_15px_rgba(255,0,222,0.3)] transition-all text-xs font-cyber cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>SAVE PNG</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
