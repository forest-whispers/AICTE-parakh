import React from "react";
import { useIntake } from "../hooks/use-intake";
import { Input } from "../../../shared/ui/input";
import { Button } from "../../../shared/ui/button";
import {
  APPLICATION_CATEGORIES,
  INDIAN_STATES_AND_UTS,
} from "../constants/statutory-documents";

interface InstitutionDetailsStepProps {
  onCancelClick: () => void;
}

export const InstitutionDetailsStep: React.FC<InstitutionDetailsStepProps> = ({
  onCancelClick,
}) => {
  const {
    institutionDetails,
    updateInstitutionDetails,
    formErrors,
    clearFieldError,
    goToNextStep,
  } = useIntake();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToNextStep();
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Left Column: Form Card */}
        <div className="bg-white border border-[#D7DEDA] rounded-[3px] p-6 sm:p-8">
          <h2 className="text-lg font-bold text-[#172E33] m-0 mb-6">
            Application particulars
          </h2>

          <div className="space-y-5">
            {/* Institution Name */}
            <div>
              <Input
                label="Institution name"
                required
                value={institutionDetails.institutionName}
                onChange={(e) => updateInstitutionDetails({ institutionName: e.target.value })}
                onFocus={() => clearFieldError("institutionName")}
                placeholder="e.g. Tungabhadra College of Engineering, Hubballi"
                error={formErrors.institutionName}
              />
            </div>

            {/* Row 2: Application Category & Academic Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="applicationCategory"
                  className="block text-[13px] font-medium text-[#172E33] mb-1.5"
                >
                  Application category <span className="text-[#A14637] ml-0.5">*</span>
                </label>
                <div className="relative">
                  <select
                    id="applicationCategory"
                    value={institutionDetails.applicationCategory}
                    onChange={(e) => updateInstitutionDetails({ applicationCategory: e.target.value })}
                    onFocus={() => clearFieldError("applicationCategory")}
                    className={`w-full bg-white text-[13px] text-[#172E33] rounded-[3px] border px-3 py-2.5 transition-colors appearance-none focus:outline-none focus:ring-1 ${
                      formErrors.applicationCategory
                        ? "border-[#A14637] focus:border-[#A14637] focus:ring-[#A14637]"
                        : "border-[#D7DEDA] focus:border-[#165A60] focus:ring-[#165A60]"
                    }`}
                  >
                    {APPLICATION_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5C6F73]">
                    <span className="text-xs">▼</span>
                  </div>
                </div>
                {formErrors.applicationCategory && (
                  <p className="mt-1 text-[11px] text-[#A14637] m-0">
                    {formErrors.applicationCategory}
                  </p>
                )}
              </div>

              <div>
                <Input
                  label="Academic year"
                  required
                  value={institutionDetails.academicYear}
                  onChange={(e) => updateInstitutionDetails({ academicYear: e.target.value })}
                  onFocus={() => clearFieldError("academicYear")}
                  placeholder="2026–27"
                  error={formErrors.academicYear}
                />
              </div>
            </div>

            {/* Row 3: Institution ID & Application Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Input
                  label="Institution ID"
                  required
                  value={institutionDetails.institutionId}
                  onChange={(e) => updateInstitutionDetails({ institutionId: e.target.value })}
                  onFocus={() => clearFieldError("institutionId")}
                  placeholder="e.g. 1-482716903"
                  error={formErrors.institutionId}
                />
              </div>

              <div>
                <Input
                  label="Institution application reference"
                  required
                  value={institutionDetails.institutionApplicationReference}
                  onChange={(e) =>
                    updateInstitutionDetails({ institutionApplicationReference: e.target.value })
                  }
                  onFocus={() => clearFieldError("institutionApplicationReference")}
                  placeholder="e.g. TCE/EOA/2026/019"
                  error={formErrors.institutionApplicationReference}
                />
              </div>
            </div>

            {/* Row 4: State / UT & City / District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="state"
                  className="block text-[13px] font-medium text-[#172E33] mb-1.5"
                >
                  State / UT <span className="text-[#A14637] ml-0.5">*</span>
                </label>
                <div className="relative">
                  <select
                    id="state"
                    value={institutionDetails.state}
                    onChange={(e) => updateInstitutionDetails({ state: e.target.value })}
                    onFocus={() => clearFieldError("state")}
                    className={`w-full bg-white text-[13px] text-[#172E33] rounded-[3px] border px-3 py-2.5 transition-colors appearance-none focus:outline-none focus:ring-1 ${
                      formErrors.state
                        ? "border-[#A14637] focus:border-[#A14637] focus:ring-[#A14637]"
                        : "border-[#D7DEDA] focus:border-[#165A60] focus:ring-[#165A60]"
                    }`}
                  >
                    {INDIAN_STATES_AND_UTS.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5C6F73]">
                    <span className="text-xs">▼</span>
                  </div>
                </div>
                {formErrors.state && (
                  <p className="mt-1 text-[11px] text-[#A14637] m-0">
                    {formErrors.state}
                  </p>
                )}
              </div>

              <div>
                <Input
                  label="City / district"
                  required
                  value={institutionDetails.cityDistrict}
                  onChange={(e) => updateInstitutionDetails({ cityDistrict: e.target.value })}
                  onFocus={() => clearFieldError("cityDistrict")}
                  placeholder="e.g. Hubballi / Dharwad"
                  error={formErrors.cityDistrict}
                />
              </div>
            </div>

            {/* Row 5: Sponsoring Body */}
            <div>
              <Input
                label="Sponsoring body"
                value={institutionDetails.sponsoringBody}
                onChange={(e) => updateInstitutionDetails({ sponsoringBody: e.target.value })}
                placeholder="e.g. Tungabhadra Education Society"
                helperText="Use the name printed on the submitted registration evidence."
              />
            </div>
          </div>
        </div>

        {/* Right Column: Informational Panel */}
        <div className="flex flex-col justify-between">
          <div>
            <h3 className="text-[17px] font-bold text-[#172E33] leading-snug m-0">
              Start with the source record.
            </h3>
            <p className="text-[13px] text-[#5C6F73] mt-3 mb-0 leading-relaxed">
              Enter the institution's application particulars. Document extraction will be compared with these values at the next validation step.
            </p>
            <p className="text-[12px] text-[#5C6F73] mt-4 mb-0 leading-relaxed">
              Required fields are marked *. A PARAKH processing reference is issued after a successful submission.
            </p>

            <div className="bg-[#E7F0EE] border-l-[3px] border-[#165A60] p-4 mt-6 rounded-r-[3px]">
              <h4 className="text-[13px] font-bold text-[#172E33] m-0">Scope of validation</h4>
              <p className="text-[12px] text-[#4A5D61] mt-1.5 mb-0 leading-normal">
                Format checks do not establish legal registration or approval. Later evidence and verification remain separate.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-8 border-t border-[#D7DEDA]">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancelClick}
          className="w-full sm:w-auto bg-white border-[#D7DEDA] text-[#172E33] hover:bg-neutral-50 px-4 py-2.5 rounded-[3px] text-[13px] font-medium"
        >
          Cancel intake
        </Button>

        <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4">
          <span className="text-[12px] text-[#5C6F73]">
            Authorized intake · no regulatory decision
          </span>
          <Button
            type="submit"
            className="bg-[#165A60] hover:bg-[#122B30] text-white px-5 py-2.5 rounded-[3px] text-[13px] font-medium inline-flex items-center gap-1.5"
          >
            Continue →
          </Button>
        </div>
      </div>
    </form>
  );
};
