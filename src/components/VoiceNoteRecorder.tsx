import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Trash2, StickyNote, AlertCircle, Paperclip } from 'lucide-react';

interface VoiceNoteRecorderProps {
  selectedHazardId: string | null;
  onAttachNote: (hazardId: string, note: string) => void;
}

// Minimal type declarations for the Web Speech API (not in standard TS DOM lib)
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      0: { transcript: string };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function VoiceNoteRecorder({ selectedHazardId, onAttachNote }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [voiceSupported] = useState(() => getSpeechRecognition() !== null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [attachedFlash, setAttachedFlash] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef('');

  const SR = getSpeechRecognition();

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!SR) return;
    setVoiceError(null);
    finalTranscriptRef.current = transcript;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current);
      setInterim(interimText);
    };

    recognition.onerror = (e: Event) => {
      const err = e as unknown as { error?: string };
      if (err.error === 'not-allowed' || err.error === 'service-not-allowed') {
        setVoiceError('Microphone permission denied. Type your note instead.');
      } else if (err.error === 'no-speech') {
        // not a hard error, just no speech detected
      } else {
        setVoiceError('Voice recognition error. Type your note instead.');
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterim('');
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      setVoiceError('Could not start voice recognition. Type your note instead.');
    }
  }, [SR, transcript]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    setIsRecording(false);
    setInterim('');
  }, []);

  const handleClear = () => {
    setTranscript('');
    finalTranscriptRef.current = '';
  };

  const handleAttach = () => {
    if (!selectedHazardId || !transcript.trim()) return;
    onAttachNote(selectedHazardId, transcript.trim());
    setAttachedFlash(true);
    setTimeout(() => setAttachedFlash(false), 2000);
  };

  const hasSelection = selectedHazardId !== null;
  const hasText = transcript.trim().length > 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Mic className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Voice Note Recorder</h3>
        {!voiceSupported && (
          <span className="ml-auto flex items-center gap-1 text-[9px] font-medium text-zinc-500">
            <AlertCircle className="h-3 w-3" /> Not supported
          </span>
        )}
      </div>

      {/* Record button + wave animation */}
      {voiceSupported && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`relative flex h-14 w-14 items-center justify-center rounded-full transition-all ${
              isRecording
                ? 'bg-red-500/20 ring-2 ring-red-500/50'
                : 'bg-amber-500/15 ring-2 ring-amber-500/30 hover:bg-amber-500/25'
            }`}
          >
            {isRecording ? (
              <Square className="h-5 w-5 fill-red-400 text-red-400" />
            ) : (
              <Mic className="h-6 w-6 text-amber-400" />
            )}
            {isRecording && (
              <span className="absolute inset-0 animate-ping rounded-full bg-red-500/20" />
            )}
          </button>

          {isRecording ? (
            <div className="flex flex-col items-center gap-1.5">
              {/* Animated wave bars */}
              <div className="flex items-end gap-1 h-6">
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-red-400"
                    style={{
                      animation: `voiceWave 0.6s ease-in-out ${i * 0.08}s infinite alternate`,
                      height: '4px',
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-[10px] uppercase tracking-wider text-red-400/70">Recording...</span>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500">Tap to record an observation</p>
          )}
        </div>
      )}

      {/* Fallback message for unsupported browsers */}
      {!voiceSupported && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <p className="text-[11px] text-zinc-500">Voice not supported in this browser - type your note instead</p>
        </div>
      )}

      {/* Voice error message */}
      {voiceError && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {voiceError}
        </div>
      )}

      {/* Editable transcript textarea */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Inspector Notes</label>
          {hasText && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-400"
            >
              <Trash2 className="h-2.5 w-2.5" /> Clear
            </button>
          )}
        </div>
        <textarea
          value={transcript + (isRecording && interim ? interim : '')}
          onChange={(e) => {
            finalTranscriptRef.current = e.target.value;
            setTranscript(e.target.value);
          }}
          placeholder="Speak or type your observation here..."
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 outline-none focus:border-amber-500/40"
        />
      </div>

      {/* Attach to selected hazard */}
      <button
        onClick={handleAttach}
        disabled={!hasSelection || !hasText}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
          attachedFlash
            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
            : hasSelection && hasText
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            : 'border-zinc-800 bg-zinc-900/40 text-zinc-600 cursor-not-allowed'
        }`}
      >
        {attachedFlash ? (
          <>
            <Paperclip className="h-3.5 w-3.5" /> Note attached!
          </>
        ) : (
          <>
            <StickyNote className="h-3.5 w-3.5" />
            {hasSelection ? 'Attach to selected hazard' : 'Select a hazard to attach'}
          </>
        )}
      </button>

      <style>{`
        @keyframes voiceWave {
          0% { height: 4px; }
          100% { height: 22px; }
        }
      `}</style>
    </div>
  );
}
