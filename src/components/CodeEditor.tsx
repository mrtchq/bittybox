import React, { useRef, useEffect, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';

interface CodeEditorProps {
  value: string;
  onChange: (val: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  placeholder?: string;
  className?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  onUndo,
  onRedo,
  placeholder,
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');

  // Update highlighted syntax whenever value changes
  useEffect(() => {
    try {
      // Highlight using markup grammar (handles HTML + embedded <style> and <script>)
      const grammar = Prism.languages.markup || Prism.languages.html;
      if (grammar && value) {
        const highlighted = Prism.highlight(value, grammar, 'markup');
        setHighlightedHtml(highlighted);
      } else {
        setHighlightedHtml(escapeHtml(value));
      }
    } catch {
      setHighlightedHtml(escapeHtml(value));
    }
  }, [value]);

  // Synchronize scroll between textarea and syntax highlight pre
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Shared font & metric styles guaranteeing 100% pixel-perfect cursor & token alignment
  const sharedEditorStyle: React.CSSProperties = {
    fontFamily: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: '13px',
    lineHeight: '22px',
    letterSpacing: '0px',
    wordSpacing: '0px',
    tabSize: 2,
    MozTabSize: 2,
    fontVariantLigatures: 'none',
    fontFeatureSettings: '"liga" 0, "calt" 0',
    whiteSpace: 'pre',
    wordWrap: 'normal',
    overflowWrap: 'normal',
    padding: '16px',
    margin: 0,
    border: 0,
    boxSizing: 'border-box',
    textAlign: 'left',
  };

  // Handle key combinations (Tab indentation, Undo, Redo)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    // Handle Undo: Ctrl+Z / Cmd+Z (without shift)
    if (isCtrlOrCmd && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
      if (onUndo) {
        e.preventDefault();
        onUndo();
        return;
      }
    }

    // Handle Redo: Ctrl+Y / Cmd+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
    if ((isCtrlOrCmd && (e.key === 'y' || e.key === 'Y')) || (isCtrlOrCmd && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
      if (onRedo) {
        e.preventDefault();
        onRedo();
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert 2 spaces
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden rounded bg-[#03010a]/80 border border-cyan-500/25 ${className}`}>
      {/* Background Syntax Highlight Layer */}
      <pre
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 prism-cyber-theme"
        style={{
          ...sharedEditorStyle,
          background: 'transparent',
          color: '#e0f2fe',
        }}
      >
        <code
          style={{
            font: 'inherit',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            letterSpacing: 'inherit',
            tabSize: 2,
            MozTabSize: 2,
            fontVariantLigatures: 'none',
            padding: 0,
            margin: 0,
            border: 0,
            display: 'block',
            background: 'transparent',
            whiteSpace: 'inherit',
          }}
          dangerouslySetInnerHTML={{
            __html: (highlightedHtml || escapeHtml(placeholder || '')) + (value.endsWith('\n') ? '\n' : ''),
          }}
        />
      </pre>

      {/* Foreground Editable Transparent Textarea */}
      <textarea
        id="bitty-code-editor"
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        className="relative z-10 w-full h-full min-h-[340px] resize-none focus:outline-none cyber-scrollbar overflow-auto selection:bg-cyan-500/30 selection:text-transparent"
        style={{
          ...sharedEditorStyle,
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          caretColor: '#00f2ff',
          background: 'transparent',
          outline: 'none',
        }}
      />
    </div>
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
