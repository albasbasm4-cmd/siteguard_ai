import { useState, useRef, useEffect } from 'react';
import {
  X, ShieldCheck, FileText, Printer, CheckCircle2, Eraser, PenTool,
  AlertTriangle, DollarSign, BadgeCheck, MapPin,
} from 'lucide-react';
import type { Facility, Hazard, WorkOrder } from '@/types';
import { HAZARD_TYPE_META, SEVERITY_META, formatFine } from '@/types';
import { RULES_TABLE, FINE_FOOTNOTE } from '@/data/rulesTable';

interface ComplianceReportModalProps {
  open: boolean;
  onClose: () => void;
  hazards: Hazard[];
  facility: Facility | null;
  complianceScore: number;
  tickets: WorkOrder[];
}

function generateReportId(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SGR-${y}${m}${d}-${rand}`;
}

export function ComplianceReportModal({
  open,
  onClose,
  hazards,
  facility,
  complianceScore,
  tickets,
}: ComplianceReportModalProps) {
  const [inspectorName, setInspectorName] = useState('');
  const [signed, setSigned] = useState(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState('');
  const [reportId] = useState(generateReportId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const hasSignatureRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (!open || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    setHasSignature(false);
  }, [open]);

  // Get pointer position relative to canvas
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    hasSignatureRef.current = true;
    setHasSignature(true);
  };

  const stopDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    hasSignatureRef.current = false;
    setHasSignature(false);
  };

  const handleApproveSign = () => {
    if (!inspectorName.trim() || !hasSignature) return;
    setSigned(true);
    setSignedBy(inspectorName.trim());
    setSignedAt(new Date().toISOString());
  };

  const handlePrint = () => {
    window.print();
  };

  // Compute summary stats
  const placedHazards = hazards.filter((h) => h.zone_x >= 0);
  const totalHazards = placedHazards.length;
  const highCount = placedHazards.filter((h) => h.severity === 'high' || h.severity === 'critical').length;
  const mediumCount = placedHazards.filter((h) => h.severity === 'medium').length;
  const lowCount = placedHazards.filter((h) => h.severity === 'low').length;
  const totalFines = placedHazards.reduce((sum, h) => sum + (h.estimated_fine ?? 0), 0);
  const ticketByHazard = new Map(tickets.map((t) => [t.hazardId, t]));
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const execSummary = `During this inspection, ${totalHazards} hazard${totalHazards !== 1 ? 's' : ''} ${totalHazards !== 1 ? 'were' : 'was'} identified (${highCount} high, ${mediumCount} medium, ${lowCount} low), with an estimated total fine exposure of ${formatFine(totalFines)}.`;

  if (!open) return null;

  return (
    <>
      {/* Print-only CSS */}
      <style>{`
        @media print {
          /* Hide everything that does not contain the report, then show only the report.
             Using display:none (not visibility) so hidden content takes no space and
             the browser does not repeat the report on every printed page. */
          body *:not(:has(#print-report)):not(#print-report):not(#print-report *) {
            display: none !important;
          }
          .print-reset {
            position: static !important;
            overflow: visible !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            display: block !important;
          }
          #print-report {
            position: static !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
          }
          #print-report .print-hide { display: none !important; }
          #print-report .print-white { background: white !important; color: black !important; border-color: #ccc !important; }
          #print-report table { color: black !important; }
          #print-report th { background: #f0f0f0 !important; color: black !important; }
          #print-report td { color: black !important; border-color: #ddd !important; }
          #print-report tr { page-break-inside: avoid; }
          .print-no-scroll { max-height: none !important; overflow: visible !important; }
        }
      `}</style>

      {/* Modal backdrop */}
      <div
        className="print-reset fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
        style={{ animation: 'modalFadeIn 0.2s ease-out' }}
        onClick={onClose}
      >
        {/* Report container */}
        <div
          id="print-report"
          className="relative my-4 w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-700/60 bg-slate-900/95 shadow-2xl shadow-black/60 print-white"
          style={{ animation: 'modalSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-emerald-500" />

          {/* Close button (hidden in print) */}
          <button
            onClick={onClose}
            className="print-hide absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="print-no-scroll max-h-[90vh] overflow-y-auto p-6 md:p-8">
            {/* Report Header */}
            <div className="flex items-start justify-between border-b border-zinc-700 pb-4 print-white">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 ring-1 ring-amber-500/30">
                  <ShieldCheck className="h-7 w-7 text-amber-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white print-white">SiteGuard <span className="text-amber-400">AI</span></h1>
                  <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-400/80">Compliance Audit Report</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-zinc-500">Report ID</p>
                <p className="text-sm font-bold text-amber-400">{reportId}</p>
                <p className="mt-1 text-xs text-zinc-400">{reportDate}</p>
              </div>
            </div>

            {/* Facility info */}
            <div className="mt-4 flex flex-wrap gap-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4 print-white">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Facility</p>
                <p className="text-sm font-bold text-white">{facility?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Location</p>
                <p className="text-sm text-zinc-300">{facility?.location ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Type</p>
                <p className="text-sm text-zinc-300 uppercase">{facility?.type ?? '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Compliance Score</p>
                <p className="text-sm font-bold text-amber-400">{complianceScore}/100</p>
              </div>
            </div>

            {/* Empty state */}
            {totalHazards === 0 ? (
              <div className="mt-8 flex flex-col items-center py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-zinc-600" />
                <p className="mt-3 text-sm font-medium text-zinc-400">No hazards to report</p>
                <p className="mt-1 text-xs text-zinc-500">Add a hazard via the camera upload or floorplan to generate a report.</p>
              </div>
            ) : (
              <>
                {/* Executive Summary */}
                <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 print-white">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-amber-400">Executive Summary</h2>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-300">{execSummary}</p>
                </div>

                {/* Summary stats */}
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 print-white">
                  <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Total Hazards</p>
                    <p className="text-2xl font-bold text-white">{totalHazards}</p>
                  </div>
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">High Severity</p>
                    <p className="text-2xl font-bold text-red-400">{highCount}</p>
                  </div>
                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Medium Severity</p>
                    <p className="text-2xl font-bold text-yellow-400">{mediumCount}</p>
                  </div>
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Low Severity</p>
                    <p className="text-2xl font-bold text-blue-400">{lowCount}</p>
                  </div>
                </div>

                {/* Total fine exposure */}
                <div className="mt-3 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-4 print-white">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-red-400" />
                    <span className="text-sm font-medium text-zinc-300">Aggregate Estimated Fine Exposure</span>
                  </div>
                  <span className="text-2xl font-bold text-red-400">{formatFine(totalFines)}</span>
                </div>

                {/* Detailed Hazard Breakdown */}
                <div className="mt-6 print-white">
                  <h2 className="mb-3 text-sm font-bold text-white">Detailed Hazard Breakdown</h2>
                  <div className="overflow-x-auto rounded-lg border border-zinc-700/50 print-white">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-700 bg-zinc-800/50 print-white">
                          <th className="px-3 py-2 font-bold text-zinc-400">Photo</th>
                          <th className="px-3 py-2 font-bold text-zinc-400">Hazard</th>
                          <th className="px-3 py-2 font-bold text-zinc-400">Severity</th>
                          <th className="px-3 py-2 font-bold text-zinc-400">Regulation</th>
                          <th className="px-3 py-2 font-bold text-zinc-400">Est. Fine</th>
                          <th className="px-3 py-2 font-bold text-zinc-400">Corrective Action</th>
                          <th className="px-3 py-2 font-bold text-zinc-400">Notes</th>
                          <th className="px-3 py-2 font-bold text-zinc-400">Ticket Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {placedHazards.map((hazard, idx) => {
                          const meta = HAZARD_TYPE_META[hazard.type];
                          const sevMeta = SEVERITY_META[hazard.severity];
                          const rule = hazard.rule_id ? RULES_TABLE[hazard.rule_id] : null;
                          const title = rule?.title ?? meta.label;
                          return (
                            <tr
                              key={hazard.id}
                              className={`border-b border-zinc-800 ${idx % 2 === 0 ? 'bg-zinc-900/30' : ''} print-white`}
                            >
                              <td className="px-3 py-2">
                                {hazard.photo_url ? (
                                  <img src={hazard.photo_url} alt={title} className="h-12 w-16 rounded object-cover" />
                                ) : (
                                  <div className="flex h-12 w-16 items-center justify-center rounded bg-zinc-800 text-zinc-600">
                                    <MapPin className="h-4 w-4" />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <p className="font-bold text-white">{title}</p>
                                <p className="text-[10px] text-zinc-500">{hazard.location_label}</p>
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                                  style={{
                                    backgroundColor: `${sevMeta.pinColor}20`,
                                    color: sevMeta.pinColor,
                                  }}
                                >
                                  {hazard.severity}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {hazard.regulation && (
                                  <span className="flex items-center gap-1 text-amber-400">
                                    <BadgeCheck className="h-2.5 w-2.5" />
                                    {hazard.regulation}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 font-bold text-red-400">
                                {hazard.estimated_fine != null ? formatFine(hazard.estimated_fine) : '—'}
                              </td>
                              <td className="px-3 py-2 text-zinc-300" style={{ maxWidth: '200px' }}>
                                {hazard.corrective_action ?? '—'}
                              </td>
                              <td className="px-3 py-2 text-zinc-400" style={{ maxWidth: '150px' }}>
                                {hazard.notes ?? '—'}
                              </td>
                              <td className="px-3 py-2">
                                {(() => {
                                  const ticket = ticketByHazard.get(hazard.id);
                                  if (!ticket) return <span className="text-zinc-600">—</span>;
                                  const meta = {
                                    open: { label: 'Open', color: 'text-red-400' },
                                    in_progress: { label: 'In Progress', color: 'text-amber-400' },
                                    resolved: { label: 'Resolved', color: 'text-emerald-400' },
                                  }[ticket.status];
                                  return (
                                    <span className="whitespace-nowrap">
                                      <span className={`font-bold ${meta.color}`}>{meta.label}</span>
                                      <span className="ml-1 font-mono text-[10px] text-zinc-500">{ticket.ticketId}</span>
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Disclaimer */}
                <p className="mt-4 text-[10px] italic leading-relaxed text-zinc-500 print-white">{FINE_FOOTNOTE}</p>

                {/* Digital Sign-off */}
                <div className="mt-6 rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-4 print-white">
                  <h2 className="mb-3 text-sm font-bold text-white">Digital Sign-off</h2>

                  {!signed ? (
                    <div className="space-y-3">
                      {/* Inspector name */}
                      <div>
                        <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-500">Inspector Name</label>
                        <input
                          type="text"
                          value={inspectorName}
                          onChange={(e) => setInspectorName(e.target.value)}
                          placeholder="Enter your full name"
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-500/40"
                        />
                      </div>

                      {/* Signature canvas */}
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-[10px] uppercase tracking-wider text-zinc-500">Signature</label>
                          <button
                            onClick={clearSignature}
                            className="print-hide flex items-center gap-1 text-[10px] text-zinc-500 hover:text-red-400"
                          >
                            <Eraser className="h-3 w-3" /> Clear
                          </button>
                        </div>
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={150}
                          onPointerDown={startDraw}
                          onPointerMove={draw}
                          onPointerUp={stopDraw}
                          onPointerLeave={stopDraw}
                          className="w-full rounded-lg border border-zinc-600 bg-white touch-none print-white"
                          style={{ aspectRatio: '600/150' }}
                        />
                      </div>

                      {/* Approve & Sign button */}
                      <button
                        onClick={handleApproveSign}
                        disabled={!inspectorName.trim() || !hasSignature}
                        className={`print-hide flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-bold transition-all ${
                          inspectorName.trim() && hasSignature
                            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                            : 'border-zinc-800 bg-zinc-900/40 text-zinc-600 cursor-not-allowed'
                        }`}
                      >
                        <PenTool className="h-4 w-4" />
                        Approve &amp; Sign
                      </button>
                      <p className="text-[10px] text-zinc-600 text-center">Name and signature required to sign</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 print-white">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        <span className="text-sm font-bold text-emerald-400">Signed</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-4">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Inspector</p>
                          <p className="text-sm font-bold text-white">{signedBy}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Date</p>
                          <p className="text-sm text-white">
                            {signedAt ? new Date(signedAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : reportDate}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <img
                          src={canvasRef.current?.toDataURL('image/png') ?? ''}
                          alt="Signature"
                          className="max-h-20 rounded border border-zinc-600 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Print button */}
            {totalHazards > 0 && (
              <div className="mt-4 flex justify-center print-hide">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-6 py-2.5 text-sm font-bold text-amber-400 transition-colors hover:bg-amber-500/25"
                >
                  <Printer className="h-4 w-4" />
                  Print / Save as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
