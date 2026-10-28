import React, { useState, useRef } from "react";
import { useIntake } from "../hooks/use-intake";
import { Button } from "../../../shared/ui/button";
import { STATUTORY_DOCUMENT_CATEGORIES } from "../constants/statutory-documents";
import { IntakeBlockingAlert } from "./intake-blocking-alert";
import { DocumentPreviewModal } from "./document-preview-modal";
import type { StagedDocument } from "../types/intake.types";

interface DocumentIntakeStepProps {
  onBoundaryProceed?: () => void;
}

export const DocumentIntakeStep: React.FC<DocumentIntakeStepProps> = ({
  onBoundaryProceed,
}) => {
  const {
    goToPreviousStep,
    stagedDocuments,
    addStagedDocument,
    removeStagedDocument,
    replaceStagedDocument,
    activeAlert,
    clearAlert,
    missingRequiredCategories,
    isStep2Valid,
    isUploading,
    submitApplication,
  } = useIntake();

  // Selected Category & Issuing Reference for upload
  const [selectedCategory, setSelectedCategory] = useState<string>("DOC_03_LAND_DEED");
  const [issuingReference, setIssuingReference] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<StagedDocument | null>(null);

  // Hidden File Input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [targetReplaceDocId, setTargetReplaceDocId] = useState<string | null>(null);

  const selectedCategoryDef = STATUTORY_DOCUMENT_CATEGORIES.find((c) => c.code === selectedCategory);

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    addStagedDocument(selectedCategory, issuingReference, file);

    // Reset file input value so same file can be picked again if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleReplaceSelect = (files: FileList | null) => {
    if (!files || files.length === 0 || !targetReplaceDocId) return;
    const file = files[0];
    replaceStagedDocument(targetReplaceDocId, file);
    setTargetReplaceDocId(null);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = "";
    }
  };

  const triggerReplace = (docId: string) => {
    setTargetReplaceDocId(docId);
    replaceFileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Group categories for right-hand checklist
  const requiredList = STATUTORY_DOCUMENT_CATEGORIES.filter((c) => c.isRequired);
  const optionalList = STATUTORY_DOCUMENT_CATEGORIES.filter((c) => !c.isRequired);

  return (
    <div>
      {/* Hidden system file pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.xlsx"
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.xlsx"
        className="hidden"
        onChange={(e) => handleReplaceSelect(e.target.files)}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal document={previewDoc} onClose={() => setPreviewDoc(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Left Column: Upload Work Area */}
        <div className="space-y-6">
          {/* Card 1: Add Supporting Evidence */}
          <div className="bg-white border border-[#D7DEDA] rounded-[3px] p-6 sm:p-7">
            <div className="flex flex-wrap items-baseline gap-2 mb-5">
              <h2 className="text-base font-bold text-[#172E33] m-0">Add supporting evidence</h2>
              <span className="font-mono text-[11px] text-[#5C6F73]">
                / &nbsp;PDF / XLSX · category rules apply
              </span>
            </div>

            {/* Category Dropdown & Issuing Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label
                  htmlFor="documentCategory"
                  className="block text-[13px] font-medium text-[#172E33] mb-1.5"
                >
                  Document category <span className="text-[#A14637] ml-0.5">*</span>
                </label>
                <div className="relative">
                  <select
                    id="documentCategory"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      const def = STATUTORY_DOCUMENT_CATEGORIES.find((c) => c.code === e.target.value);
                      if (def && !issuingReference) {
                        setIssuingReference(def.referencePlaceholder.replace("e.g. ", ""));
                      }
                    }}
                    className="w-full bg-white text-[13px] text-[#172E33] rounded-[3px] border border-[#D7DEDA] px-3 py-2.5 transition-colors appearance-none focus:outline-none focus:border-[#165A60] focus:ring-1 focus:ring-[#165A60]"
                  >
                    {STATUTORY_DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat.code} value={cat.code}>
                        {cat.shortLabel} ({cat.code}) {cat.isRequired ? "*" : "(Optional)"}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5C6F73]">
                    <span className="text-xs">▼</span>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="issuingReference"
                  className="block text-[13px] font-medium text-[#172E33] mb-1.5"
                >
                  Document / issuing reference <span className="text-[#A14637] ml-0.5">*</span>
                </label>
                <input
                  id="issuingReference"
                  type="text"
                  value={issuingReference}
                  onChange={(e) => setIssuingReference(e.target.value)}
                  placeholder={selectedCategoryDef?.referencePlaceholder || "e.g. KA/DWD/LR/2026/084"}
                  className="w-full bg-white text-[13px] text-[#172E33] rounded-[3px] border border-[#D7DEDA] px-3 py-2.5 transition-colors focus:outline-none focus:border-[#165A60] focus:ring-1 focus:ring-[#165A60]"
                />
              </div>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-dashed border-[1.5px] rounded-[3px] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                isDragOver
                  ? "border-[#165A60] bg-[#E7F0EE]"
                  : "border-[#165A60] bg-[#FAFAF8]"
              }`}
            >
              <div>
                <div className="text-[13px] font-semibold text-[#172E33]">
                  Drop a file here or select from device
                </div>
                <div className="text-[12px] text-[#5C6F73] mt-0.5">
                  One document per category. PDF evidence; JPG/PNG accepted under 25 MB.
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white border border-[#D7DEDA] px-4 py-2 rounded-[3px] text-[13px] font-medium text-[#172E33] hover:bg-neutral-50 shadow-none transition-colors shrink-0"
              >
                Select file
              </button>
            </div>
          </div>

          {/* Active Blocking / Recovery Notice */}
          {activeAlert && (
            <IntakeBlockingAlert
              alert={activeAlert}
              onDismiss={clearAlert}
              onSelectAnotherFile={() => fileInputRef.current?.click()}
              onReviewExisting={clearAlert}
            />
          )}

          {/* Card 2: Uploaded Documents Table */}
          <div className="bg-white border border-[#D7DEDA] rounded-[3px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFAF8] border-b border-[#D7DEDA] text-[10px] font-mono tracking-wider text-[#5C6F73] uppercase select-none">
                    <th className="py-2.5 px-4 font-medium">DOCUMENT / FILENAME</th>
                    <th className="py-2.5 px-4 font-medium">FORMAT / SIZE</th>
                    <th className="py-2.5 px-4 font-medium">PROCESSING</th>
                    <th className="py-2.5 px-4 font-medium text-right">FILE ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D7DEDA] text-[13px]">
                  {stagedDocuments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 px-4 text-center text-[#5C6F73] bg-white">
                        <div className="text-sm font-medium text-[#172E33]">No documents added yet</div>
                        <div className="text-xs text-[#8A9B9D] mt-1">
                          Select a category above and pick a statutory document from your device.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    stagedDocuments.map((doc) => (
                      <tr key={doc.id} className="hover:bg-[#FAFAF8] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-[#172E33]">
                            {doc.shortLabel} <span className="font-mono text-xs text-[#5C6F73]">({doc.categoryCode})</span>
                          </div>
                          <div className="font-mono text-[11px] text-[#5C6F73] truncate max-w-[240px]">
                            {doc.fileName}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-[12px] text-[#5C6F73]">
                          {doc.formattedSize}
                        </td>
                        <td className="py-3 px-4">
                          <div className="inline-flex items-center gap-1.5 text-[12px] text-[#376850] font-medium">
                            <span>✓</span>
                            <span>Uploaded</span>
                          </div>
                          <div className="text-[11px] text-[#5C6F73]">
                            {doc.processingNote}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="text-[12px] text-[#165A60] hover:underline font-medium"
                            >
                              Preview
                            </button>
                            <span className="text-[#D7DEDA]">/</span>
                            <button
                              type="button"
                              onClick={() => triggerReplace(doc.id)}
                              className="text-[12px] text-[#165A60] hover:underline font-medium"
                            >
                              Replace →
                            </button>
                            <span className="text-[#D7DEDA]">/</span>
                            <button
                              type="button"
                              onClick={() => removeStagedDocument(doc.id)}
                              className="text-[12px] text-[#A14637] hover:underline font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Missing Evidence Warning Banner */}
          {missingRequiredCategories.length > 0 && (
            <div className="bg-[#FEF7EC] border-l-[3px] border-[#94631F] p-4 rounded-r-[3px]">
              <h4 className="text-[13px] font-bold text-[#94631F] m-0">
                Required evidence still missing
              </h4>
              <p className="text-[12px] text-[#172E33] mt-1 mb-0 leading-relaxed">
                {missingRequiredCategories.length} statutory document(s) have not been added yet:{" "}
                <span className="font-medium">
                  {missingRequiredCategories
                    .map((code) => {
                      const c = STATUTORY_DOCUMENT_CATEGORIES.find((x) => x.code === code);
                      return c?.shortLabel || code;
                    })
                    .slice(0, 3)
                    .join(", ")}
                  {missingRequiredCategories.length > 3 ? " and others" : ""}.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Evidence Checklist & Processing Summary */}
        <div>
          <div className="bg-white border border-[#D7DEDA] rounded-[3px] p-6 sticky top-6">
            <h3 className="text-base font-bold text-[#172E33] m-0">Evidence checklist</h3>

            {/* Required Section */}
            <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mt-4 mb-2.5 block">
              REQUIRED FOR THIS CATEGORY
            </div>
            <div className="space-y-2">
              {requiredList.map((item) => {
                const isStaged = stagedDocuments.some((d) => d.categoryCode === item.code);
                return (
                  <div key={item.code} className="flex items-start gap-2 text-[13px]">
                    <span
                      className={`text-xs mt-0.5 ${
                        isStaged ? "text-[#376850] font-bold" : "text-[#8A9B9D]"
                      }`}
                    >
                      {isStaged ? "✓" : "○"}
                    </span>
                    <span
                      className={
                        isStaged
                          ? "text-[#172E33] font-medium"
                          : "text-[#5C6F73]"
                      }
                    >
                      {item.shortLabel} <span className="font-mono text-xs opacity-80">({item.code})</span> {isStaged ? "" : "— missing"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#D7DEDA] my-4" />

            {/* Optional Section */}
            <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-2.5 block">
              OPTIONAL
            </div>
            <div className="space-y-2">
              {optionalList.map((item) => {
                const isStaged = stagedDocuments.some((d) => d.categoryCode === item.code);
                return (
                  <div key={item.code} className="flex items-start gap-2 text-[13px]">
                    <span
                      className={`text-xs mt-0.5 ${
                        isStaged ? "text-[#376850] font-bold" : "text-[#8A9B9D]"
                      }`}
                    >
                      {isStaged ? "✓" : "○"}
                    </span>
                    <span className="text-[#5C6F73]">{item.shortLabel} <span className="font-mono text-xs opacity-80">({item.code})</span></span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[#D7DEDA] my-4" />

            {/* Processing Summary */}
            <h4 className="text-[14px] font-bold text-[#172E33] m-0 mb-2">
              Processing summary
            </h4>
            <div className="text-[13px] font-medium text-[#172E33]">
              {stagedDocuments.length} file{stagedDocuments.length === 1 ? "" : "s"} added ·{" "}
              {missingRequiredCategories.length} required missing
            </div>
            <p className="text-[12px] text-[#5C6F73] mt-2 mb-0 leading-relaxed">
              Concise intake checks only; no scrutiny report is generated here.
            </p>
            <p className="text-[11px] text-[#8A9B9D] mt-2 mb-0 leading-relaxed">
              Conditional feedback examples: invalid format and duplicate file checks depend on enabled upload validation; see state sheet.
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-8 border-t border-[#D7DEDA]">
        <Button
          type="button"
          variant="secondary"
          onClick={goToPreviousStep}
          className="w-full sm:w-auto bg-white border-[#D7DEDA] text-[#172E33] hover:bg-neutral-50 px-4 py-2.5 rounded-[3px] text-[13px] font-medium inline-flex items-center gap-1.5"
        >
          ← Back
        </Button>

        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
          <span className="text-[12px] text-[#5C6F73]">
            Authorized intake · no regulatory decision
          </span>
          <Button
            type="button"
            onClick={async () => {
              const success = await submitApplication();
              if (success && onBoundaryProceed) {
                onBoundaryProceed();
              }
            }}
            disabled={!isStep2Valid || isUploading}
            className={`px-5 py-2.5 rounded-[3px] text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors ${
              isStep2Valid && !isUploading
                ? "bg-[#165A60] hover:bg-[#122B30] text-white cursor-pointer"
                : "bg-[#D7DEDA] text-[#8A9B9D] cursor-not-allowed"
            }`}
          >
            {isUploading ? (
              <>
                <span className="inline-block animate-spin mr-1">◌</span>
                Uploading Application...
              </>
            ) : (
              "Upload Application"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
