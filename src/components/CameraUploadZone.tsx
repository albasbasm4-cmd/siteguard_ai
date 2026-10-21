import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera, Upload, X, FileImage, CheckCircle2, AlertTriangle,
  Loader2, Bot, User, FlaskConical, ShieldAlert, ChevronDown, Check, MapPin,
  ImageOff, BadgeCheck,
} from 'lucide-react';
import { RULES_TABLE, RULES_LIST, FINE_FOOTNOTE, type HazardSource } from '@/data/rulesTable';
import { supabase } from '@/lib/supabase';
import { formatFine } from '@/types';

interface CameraUploadZoneProps {
  facilityId: string;
  onAddToReport: (ruleId: string, source: HazardSource, photoUrl: string | null, confidence: number | null, shortReason: string | null) => void;
}

type AICategory = 'hazard' | 'no_hazard' | 'irrelevant';

interface AnalysisResult {
  ruleId: string;
  source: HazardSource;
  confidence: number | null;
  shortReason: string | null;
  category?: AICategory;
}

interface NonHazardOutcome {
  category: 'no_hazard' | 'irrelevant';
  confidence: number | null;
  reason: string | null;
}

interface UploadedFile {
  name: string;
  size: string;
  preview: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 8 * 1024 * 1024; // 8MB

// Must stay in sync with ALLOWED_MODELS in supabase/functions/analyze-hazard/index.ts
const AI_MODELS: { id: string; label: string }[] = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
];
const DEFAULT_MODEL = 'gemini-3.6-flash';
const MODEL_STORAGE_KEY = 'siteguard_ai_model';

function loadSavedModel(): string {
  try {
    const saved = localStorage.getItem(MODEL_STORAGE_KEY);
    if (saved && AI_MODELS.some((m) => m.id === saved)) return saved;
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_MODEL;
}

const SOURCE_BADGE: Partial<Record<HazardSource, { label: string; icon: typeof Bot; color: string }>> = {
  ai: { label: 'AI', icon: Bot, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30' },
  inspector: { label: 'Inspector selected', icon: User, color: 'text-zinc-400 bg-zinc-500/15 border-zinc-500/30' },
};

export function CameraUploadZone({ onAddToReport }: CameraUploadZoneProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [nonHazard, setNonHazard] = useState<NonHazardOutcome | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [showManualDropdown, setShowManualDropdown] = useState(false);
  const [manualSelected, setManualSelected] = useState<string>('');
  const [addedToReport, setAddedToReport] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(loadSavedModel);
  const [modelExhausted, setModelExhausted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
    } catch {
      // localStorage unavailable
    }
  }, [selectedModel]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Resize image on canvas to max 1024px, JPEG quality 0.8
  const resizeImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1024;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height / width) * maxDim);
              width = maxDim;
            } else {
              width = Math.round((width / height) * maxDim);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not supported')); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  // Call the edge function for real AI analysis
  const callAIAnalysis = useCallback(async (base64Image: string, model: string): Promise<AnalysisResult | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // Strip "data:image/jpeg;base64," prefix and extract mime type
    const commaIdx = base64Image.indexOf(',');
    const isDataUrl = base64Image.startsWith('data:') && commaIdx > 0;
    const rawBase64 = isDataUrl ? base64Image.slice(commaIdx + 1) : base64Image;
    let mimeType = 'image/jpeg';
    if (isDataUrl) {
      const match = base64Image.slice(5, commaIdx).match(/^([^;]+)/);
      if (match) mimeType = match[1];
    }

    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('analyze-hazard', {
        body: { image_base64: rawBase64, mime_type: mimeType, model },
      });
      clearTimeout(timeout);

      if (funcError || !funcData) {
        return null;
      }

      const { category, hazard_type, confidence, short_reason_en } = funcData;

      if (category === 'irrelevant' || category === 'no_hazard') {
        return {
          ruleId: '',
          source: 'ai',
          confidence: typeof confidence === 'number' ? confidence : null,
          shortReason: short_reason_en ?? null,
          category,
        };
      }

      // Validate hazard_type exists in rules table
      if (!hazard_type || hazard_type === 'none' || !RULES_TABLE[hazard_type]) {
        return null;
      }

      // Confidence below 0.5 -> fallback
      if (typeof confidence !== 'number' || confidence < 0.5) {
        return null;
      }

      return {
        ruleId: hazard_type,
        source: 'ai',
        confidence,
        shortReason: short_reason_en ?? null,
        category: 'hazard',
      };
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }, []);

  const handleAnalysis = useCallback(async (file: File, previewUrl: string) => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setNonHazard(null);
    setAddedToReport(false);
    setShowManualDropdown(false);
    setResultImage(previewUrl);

    // Real mode: resize image and call AI
    try {
      const resized = await resizeImage(file);
      const aiResult = await callAIAnalysis(resized, selectedModel);

      if (aiResult && (aiResult.category === 'irrelevant' || aiResult.category === 'no_hazard')) {
        setNonHazard({
          category: aiResult.category,
          confidence: aiResult.confidence,
          reason: aiResult.shortReason,
        });
      } else if (aiResult) {
        setResult(aiResult);
        setModelExhausted(false);
      } else {
        // Fallback: likely quota exhausted on this model — suggest switching
        setModelExhausted(true);
        setShowManualDropdown(true);
      }
    } catch {
      setModelExhausted(true);
      setShowManualDropdown(true);
    }
    setAnalyzing(false);
  }, [resizeImage, callAIAnalysis, selectedModel]);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      // Validate type
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Only JPG, PNG, and WEBP images are accepted.');
        return;
      }
      // Validate size
      if (file.size > MAX_SIZE) {
        setError('Image exceeds 8MB limit. Please upload a smaller file.');
        return;
      }

      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const uploaded: UploadedFile = {
          name: file.name,
          size: formatSize(file.size),
          preview,
        };
        setFiles((prev) => [uploaded, ...prev]);
        // Trigger analysis
        void handleAnalysis(file, preview);
      };
      reader.readAsDataURL(file);
    });
  }, [handleAnalysis]);

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    if (idx === 0) {
      setResult(null);
      setNonHazard(null);
      setResultImage(null);
      setShowManualDropdown(false);
      setAddedToReport(false);
    }
  };

  const handleManualConfirm = useCallback(() => {
    if (!manualSelected) return;
    setResult({
      ruleId: manualSelected,
      source: 'inspector',
      confidence: null,
      shortReason: 'Inspector selected classification',
    });
    setShowManualDropdown(false);
  }, [manualSelected]);

  const handleAddToReport = useCallback(() => {
    if (!result) return;
    onAddToReport(result.ruleId, result.source, resultImage, result.confidence, result.shortReason);
    setAddedToReport(true);
  }, [result, resultImage, onAddToReport]);

  const currentRule = result ? RULES_TABLE[result.ruleId] : null;
  const sourceBadge = result ? SOURCE_BADGE[result.source] : null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Camera className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Camera / File Upload</h3>
        <span className="ml-auto flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-cyan-400">
          <Bot className="h-2.5 w-2.5" /> AI Mode
        </span>
      </div>

      {/* Model selector */}
      <div className="mb-2 flex items-center gap-2">
        <label className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          <Bot className="h-3 w-3" /> AI Model
        </label>
        <div className="relative flex-1">
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setModelExhausted(false);
            }}
            disabled={analyzing}
            className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 pr-7 text-xs text-white outline-none transition-colors focus:border-cyan-500/50 disabled:opacity-50"
          >
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
                {m.id === selectedModel ? ' (selected)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300" style={{ animation: 'logSlide 0.3s ease-out' }}>
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-300">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Camera / Gallery pickers — two side-by-side boxes */}
      <div className="grid grid-cols-2 gap-2">        <button
          onClick={() => cameraInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-700/50 p-4 transition-colors hover:border-amber-500/60 hover:bg-amber-500/5"
        >
          <Camera className="h-6 w-6 text-amber-400" />
          <p className="text-xs font-medium text-white">Use Camera</p>
          <p className="text-[10px] text-zinc-600">Open device camera</p>
        </button>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-700/50 p-4 transition-colors hover:border-cyan-500/60 hover:bg-cyan-500/5"
        >
          <Upload className="h-6 w-6 text-cyan-400" />
          <p className="text-xs font-medium text-white">From Gallery</p>
          <p className="text-[10px] text-zinc-600">JPG, PNG, WEBP — max 8MB</p>
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Uploaded files */}
      {files.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2"
              style={{ animation: 'logSlide 0.3s ease-out' }}
            >
              {file.preview ? (
                <img src={file.preview} alt={file.name} className="h-8 w-8 rounded object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-zinc-800">
                  <FileImage className="h-4 w-4 text-zinc-500" />
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-medium text-zinc-300">{file.name}</p>
                <p className="text-[10px] text-zinc-600">{file.size}</p>
              </div>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                className="shrink-0 text-zinc-600 hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Analyzing skeleton */}
      {analyzing && (
        <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3" style={{ animation: 'logSlide 0.3s ease-out' }}>
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            <span className="text-xs font-medium text-zinc-300">Analyzing image...</span>
          </div>
          <div className="mt-2 space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
            <div className="h-8 w-full animate-pulse rounded bg-zinc-800/50" />
          </div>
        </div>
      )}

      {/* Irrelevant image outcome */}
      {!analyzing && nonHazard?.category === 'irrelevant' && (
        <div
          className="mt-2 overflow-hidden rounded-lg border border-orange-500/30 bg-orange-500/5"
          style={{ animation: 'logSlide 0.3s ease-out' }}
        >
          {resultImage && (
            <div className="relative h-20 w-full overflow-hidden">
              <img src={resultImage} alt="Uploaded" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 to-transparent" />
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-orange-300">
                <ImageOff className="h-2.5 w-2.5" />
                Not Safety Related
              </div>
            </div>
          )}
          <div className="p-3">
            <div className="flex items-center gap-2">
              <ImageOff className="h-4 w-4 shrink-0 text-orange-400" />
              <h4 className="text-sm font-bold text-white">Not Safety Related</h4>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-orange-200">
              {nonHazard.reason || 'This image is not related to site safety or industrial inspection.'}
            </p>
            {nonHazard.reason ? (
              <div className="mt-2 rounded-lg border border-zinc-700/50 bg-zinc-900/60 p-2.5">
                <p className="text-[11px] leading-relaxed text-zinc-300">{nonHazard.reason}</p>
              </div>
            ) : null}
            {nonHazard.confidence !== null && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">AI confidence</span>
                <span className="rounded border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-bold text-orange-300">
                  {Math.round(nonHazard.confidence * 100)}%
                </span>
              </div>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
              No violation code or fine applied. Please upload a photo of the work site, equipment, or warehouse area.
            </p>
          </div>
        </div>
      )}

      {/* Fully compliant outcome */}
      {!analyzing && nonHazard?.category === 'no_hazard' && (
        <div
          className="mt-2 overflow-hidden rounded-lg border border-emerald-500/30 bg-emerald-500/5"
          style={{ animation: 'logSlide 0.3s ease-out' }}
        >
          {resultImage && (
            <div className="relative h-20 w-full overflow-hidden">
              <img src={resultImage} alt="Uploaded" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 to-transparent" />
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                <BadgeCheck className="h-2.5 w-2.5" />
                Fully Compliant
              </div>
            </div>
          )}
          <div className="p-3">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">Fully Compliant</h4>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-emerald-200">
              {nonHazard.reason || 'No safety hazards or violations detected in this image.'}
            </p>
            {nonHazard.reason ? (
              <div className="mt-2 rounded-lg border border-zinc-700/50 bg-zinc-900/60 p-2.5">
                <p className="text-[11px] leading-relaxed text-zinc-300">{nonHazard.reason}</p>
              </div>
            ) : null}
            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5">
              <span className="text-[10px] font-medium text-emerald-300">Compliance Score</span>
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-emerald-400">100%</span>
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-400" />
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between rounded-lg border border-zinc-700/50 bg-zinc-900/60 px-2.5 py-1.5">
              <span className="text-[10px] font-medium text-zinc-400">Estimated Fine</span>
              <span className="text-sm font-bold text-emerald-400">$0</span>
            </div>
            {nonHazard.confidence !== null && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500">AI confidence</span>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                  {Math.round(nonHazard.confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result card */}
      {!analyzing && currentRule && result && (
        <div className="mt-2 overflow-hidden rounded-lg border border-zinc-700/60 bg-zinc-900/70" style={{ animation: 'logSlide 0.3s ease-out' }}>
          {/* Result header with image */}
          {resultImage && (
            <div className="relative h-20 w-full overflow-hidden">
              <img src={resultImage} alt={currentRule.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 to-transparent" />
              {sourceBadge && (
                <div className={`absolute right-2 top-2 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${sourceBadge.color}`}>
                  <sourceBadge.icon className="h-2.5 w-2.5" />
                  {sourceBadge.label}
                </div>
              )}
            </div>
          )}

          <div className="p-3">
            {/* Title + severity badge */}
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
              <h4 className="flex-1 text-sm font-bold text-white">{currentRule.title}</h4>
              <span className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                currentRule.severity === 'high' ? 'bg-red-500/20 text-red-300' :
                currentRule.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-blue-500/20 text-blue-300'
              }`}>
                {currentRule.severity}
              </span>
            </div>

            {/* Regulation code */}
            <div className="mt-2 flex items-center gap-1.5">
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400">
                {currentRule.regulation_code}
              </span>
              {result.confidence !== null && (
                <span className="flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold text-cyan-400">
                  {Math.round(result.confidence * 100)}% confidence
                </span>
              )}
            </div>

            {/* Short reason */}
            {result.shortReason && (
              <div className="mt-1.5">
                <p className="text-[11px] leading-relaxed text-zinc-400">{result.shortReason}</p>
              </div>
            )}

            {/* Estimated fine */}
            <div className="mt-2 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5">
              <span className="text-[10px] font-medium text-zinc-400">Estimated Fine</span>
              <span className="text-sm font-bold text-red-400">{formatFine(currentRule.estimated_fine_usd)}</span>
            </div>

            {/* Corrective action */}
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <p className="text-[10px] font-bold text-emerald-400">Corrective Action</p>
              <p className="mt-1 text-[11px] leading-relaxed text-zinc-300">{currentRule.corrective_action}</p>
            </div>

            {/* Footnote */}
            <p className="mt-2 text-[9px] italic leading-relaxed text-zinc-600">{FINE_FOOTNOTE}</p>

            {/* Add to Report button */}
            {addedToReport ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">
                <Check className="h-3.5 w-3.5" />
                Added to report. Click the floorplan to place this pin.
                <MapPin className="ml-auto h-3.5 w-3.5 animate-pulse" />
              </div>
            ) : (
              <button
                onClick={handleAddToReport}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-400 transition-colors hover:bg-amber-500/25"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Add to Report
              </button>
            )}
          </div>
        </div>
      )}

      {/* Manual classification fallback */}
      {!analyzing && showManualDropdown && (
        <div className="mt-2 rounded-lg border border-zinc-700/60 bg-zinc-900/70 p-3" style={{ animation: 'logSlide 0.3s ease-out' }}>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-zinc-400" />
            <h4 className="text-sm font-bold text-white">Could not classify automatically</h4>
          </div>
          <p className="mt-1 text-[10px] text-zinc-500">AI service not connected — using manual classification</p>
          {modelExhausted && (
            <p className="mt-1 text-[10px] leading-relaxed text-amber-400">
              The selected model may have hit its daily limit. Try a different AI model above, then re-upload the photo.
            </p>
          )}
          <div className="mt-2 space-y-2">
            <div className="relative">
              <select
                value={manualSelected}
                onChange={(e) => setManualSelected(e.target.value)}
                className="w-full appearance-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-8 text-xs text-white outline-none focus:border-amber-500/50"
              >
                <option value="">Select hazard type...</option>
                {RULES_LIST.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.title} ({rule.severity})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
            <button
              onClick={handleManualConfirm}
              disabled={!manualSelected}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-bold text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-40"
            >
              <Check className="h-3.5 w-3.5" />
              Confirm
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes logSlide {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
