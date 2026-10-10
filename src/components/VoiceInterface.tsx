/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Send, Loader2, ArrowRight } from 'lucide-react';
import { playHarmonicChime, spawnStardustBurst } from './CosmicAtmosphere';

interface VoiceInterfaceProps {
  onArtifactGenerated: (artifact: any) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onArtifactGenerated }) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState<boolean>(true);
  const recognitionRef = useRef<any>(null);

  const SUGGESTED_VOICE_PROMPTS = [
    'Build me a tiny onboarding flow.',
    'Create a capsule that unlocks tomorrow with secret code.',
    'Generate an agentic chain for system diagnostics.',
    'Make an executive telemetry briefing micro-site.',
  ];

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setAgentResponse('');
      playHarmonicChime(880, 0.15);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        setIsListening(true);
      }
    }
  };

  const speakText = (text: string) => {
    if (!audioFeedbackEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  const executeVoiceCommand = async (commandText: string, e?: React.MouseEvent) => {
    const textToRun = commandText.trim();
    if (!textToRun) return;

    if (e) {
      spawnStardustBurst(e.clientX, e.clientY, 20);
    }
    playHarmonicChime(780, 0.2);

    setIsProcessing(true);
    setAgentResponse('Agent synthesizing Bitty Box artifact...');

    try {
      const res = await fetch('/api/agent/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToRun,
          authorAgent: 'voice-agent-architect',
          theme: 'obsidian-gold',
        }),
      });

      const data = await res.json();
      if (data.artifact) {
        onArtifactGenerated(data.artifact);
        const speech = data.artifact.agentSpeech || 'Synthesized Bitty Box micro-web artifact successfully.';
        setAgentResponse(speech);
        speakText(speech);
        playHarmonicChime(1040, 0.25);
      } else {
        setAgentResponse('Agent completed generation with fallback parameters.');
      }
    } catch (err: any) {
      setAgentResponse('Agent encountered error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-hud rounded-2xl p-5 shadow-2xl relative overflow-hidden border border-[#ffd159]/30">
      {/* Animated Top Rainbow Glow Accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#ffd159] via-[#00e5ff] to-[#ec4899] animate-pulse"></div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ffd159]/20 to-[#ec4899]/20 border border-[#ffd159]/40 flex items-center justify-center text-[#ffd159] shadow-md">
            <Sparkles className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <div>
            <h2 className="text-sm font-orbitron font-bold text-white tracking-wide flex items-center gap-2">
              VOICE AI INTERFACE
              <span className="text-[10px] font-rajdhani font-semibold text-[#ffd159] px-2 py-0.5 rounded-full bg-[#f5b82e]/10 border border-[#f5b82e]/30">
                HUMAN-TO-AGENT
              </span>
            </h2>
            <p className="text-xs font-sans text-slate-300">Speak natural commands directly to autonomous builders</p>
          </div>
        </div>

        <button
          onClick={() => {
            playHarmonicChime(500, 0.08);
            setAudioFeedbackEnabled(!audioFeedbackEnabled);
          }}
          className={`p-2 rounded-lg text-xs font-rajdhani flex items-center gap-1.5 transition-all border ${
            audioFeedbackEnabled
              ? 'bg-[#141428] text-[#ffd159] border-[#ffd159]/40 shadow-sm'
              : 'bg-[#080811] text-slate-500 border-slate-700'
          }`}
          title="Toggle Synthesized Voice Feedback"
        >
          <Volume2 className="w-3.5 h-3.5 text-[#ec4899]" />
          <span className="hidden sm:inline font-semibold">{audioFeedbackEnabled ? 'Voice Feedback ON' : 'Muted'}</span>
        </button>
      </div>

      {/* Voice Input & Dynamic Chromatic Waveform Bar */}
      <div className="bg-[#040407]/90 border border-[#ffd159]/25 rounded-xl p-3.5 flex items-center gap-3 shadow-inner">
        <button
          onClick={toggleListening}
          className={`p-3 rounded-xl transition-all flex items-center justify-center shrink-0 ${
            isListening
              ? 'bg-gradient-to-r from-red-500 to-[#ec4899] text-white animate-pulse shadow-lg shadow-red-500/40'
              : 'bg-gradient-to-r from-[#ffd159] to-[#f5b82e] hover:from-[#ffe082] hover:to-[#ffd159] text-[#040407] font-bold shadow-md shadow-[#ffd159]/30 hover:scale-105'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice recognition'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 stroke-[2.5]" />}
        </button>

        <div className="flex-1 relative">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && executeVoiceCommand(transcript)}
            placeholder={isListening ? 'Listening to voice command...' : 'Speak or type: "Build me a tiny onboarding flow..."'}
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none font-mono pr-12"
          />
          {isListening && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="w-1.5 h-4 bg-[#ffd159] animate-pulse rounded-full"></span>
              <span className="w-1.5 h-6 bg-[#00e5ff] animate-pulse delay-75 rounded-full"></span>
              <span className="w-1.5 h-5 bg-[#ec4899] animate-pulse delay-150 rounded-full"></span>
              <span className="w-1.5 h-3 bg-[#10b981] animate-pulse delay-200 rounded-full"></span>
            </div>
          )}
        </div>

        <button
          onClick={(e) => executeVoiceCommand(transcript, e)}
          disabled={!transcript.trim() || isProcessing}
          className="btn-glow-pulse px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ffd159] via-[#f5b82e] to-[#ec4899] disabled:opacity-40 text-[#040407] text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all shadow-md shrink-0 hover:scale-105 active:scale-95"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#040407]" />
              <span>Agents Building...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>Dispatch</span>
            </>
          )}
        </button>
      </div>

      {/* Suggested Voice Commands */}
      <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1 text-xs font-rajdhani">
        <span className="text-[11px] font-bold text-slate-400 shrink-0 tracking-wider">QUICK COMMANDS:</span>
        {SUGGESTED_VOICE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={(e) => {
              setTranscript(prompt);
              executeVoiceCommand(prompt, e);
            }}
            className="px-3 py-1 rounded-lg bg-[#0e0d1c] hover:bg-[#1e1c36] hover:text-[#ffd159] text-slate-300 transition-all border border-slate-700 hover:border-[#ffd159] shrink-0 whitespace-nowrap text-left hover:scale-105 shadow-sm"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Agent Feedback Readout with Rainbow Glow */}
      {agentResponse && (
        <div className="mt-3.5 bg-[#0e0d1c] border border-[#ffd159]/40 rounded-xl p-3.5 flex items-start gap-3 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ffd159] mt-1 shrink-0 animate-ping"></span>
          <div className="flex-1">
            <span className="text-[10px] font-rajdhani font-bold text-[#ffd159] uppercase tracking-wider block">
              Autonomous Agent Response
            </span>
            <p className="text-xs text-slate-100 font-mono mt-0.5 leading-relaxed">{agentResponse}</p>
          </div>
        </div>
      )}
    </div>
  );
};
