import React, { useState } from 'react';
import { X, Printer, Download, FileText, Palette } from 'lucide-react';
import { pdfGeneratorService, PDFGenerationPayload, PDF_ACCENT_COLORS } from '../../services/pdfGeneratorService';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: PDFGenerationPayload | null;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  payload
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(
    payload?.studioSettings?.brandAccentColor || '#09090b'
  );

  if (!isOpen || !payload) return null;

  // Clone payload with updated accent color
  const activePayload: PDFGenerationPayload = {
    ...payload,
    studioSettings: {
      ...payload.studioSettings,
      brandAccentColor: selectedColor
    }
  };

  const htmlContent = pdfGeneratorService.generateDocumentHTML(activePayload);

  const handlePrint = () => {
    pdfGeneratorService.printDocument(activePayload);
  };

  const handleDownload = () => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activePayload.title.replace(/\s+/g, '_')}_${activePayload.documentNumber || 'doc'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white border border-zinc-200 rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl h-[92vh] max-h-[900px] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 border-b border-zinc-200 bg-zinc-50/80 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 leading-tight">
                {activePayload.title}
              </h2>
              <p className="text-xs text-zinc-500 font-mono">
                {activePayload.documentNumber || 'Official Document'}
              </p>
            </div>
          </div>

          {/* Color Palettes & Actions */}
          <div className="flex items-center gap-3">
            {/* Accent Color Selector */}
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-zinc-200">
              <Palette className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase mr-1">Accent</span>
              {PDF_ACCENT_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedColor(c.hex)}
                  title={c.name}
                  className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                    selectedColor === c.hex ? 'scale-125 ring-2 ring-offset-1 ring-zinc-500' : 'hover:scale-110 opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors shadow-xs"
                title="Print Document"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print / PDF</span>
              </button>
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-zinc-200 bg-white text-zinc-700 rounded-xl hover:bg-zinc-50 transition-colors"
                title="Download HTML Document"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Document Preview Frame */}
        <div className="flex-1 bg-zinc-100 p-2 sm:p-4 overflow-auto flex justify-center">
          <div className="w-full max-w-3xl bg-white shadow-lg rounded-xl border border-zinc-200 overflow-hidden h-full flex flex-col">
            <iframe
              srcDoc={htmlContent}
              title="Document Preview"
              className="w-full h-full border-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 border-t border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
          <span>Studio OS Multi-Page Document Engine (Multi-page safe table headers & row break prevention)</span>
          <button
            onClick={onClose}
            className="hover:underline text-zinc-700 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
