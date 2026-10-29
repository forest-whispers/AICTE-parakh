import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { IntakeProvider } from "../../intake/context/intake-context";
import { useIntake } from "../../intake/hooks/use-intake";
import { IntakeStepper } from "../../intake/components/intake-stepper";
import { ExtractionValidationStep } from "../../intake/components/extraction-validation-step";
import { ReviewApproveStep } from "../../intake/components/review-approve-step";
import { AuthorityVerificationPanel } from "../../authority/components/authority-verification-panel";
import { Button } from "../../../shared/ui/button";
import { useAuth } from "../../auth/hooks/use-auth";

const ExistingApplicationWorkspaceContent: React.FC = () => {
  const { applicationId: routeAppId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMinistryAdmin = user?.role === "MINISTRY_ADMIN";

  const {
    currentStep,
    setCurrentStep,
    institutionDetails,
    createdApplication,
    isLoadingExistingApplication,
    existingApplicationError,
  } = useIntake();

  const effectiveAppId = createdApplication?.id || routeAppId;

  const handleReturnListing = () => {
    if (isMinistryAdmin) {
      navigate("/ministry/portfolio");
    } else {
      navigate("/officer/applications");
    }
  };

  // 1. Loading State
  if (isLoadingExistingApplication) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-16 text-center select-none">
        <div className="inline-block animate-spin text-2xl text-[#165A60] mb-3">◌</div>
        <h3 className="text-base font-bold text-[#172E33] m-0">
          Loading assigned application workspace...
        </h3>
        <p className="text-xs text-[#5C6F73] mt-1 font-mono">
          Retrieving statutory evidence, VLM extraction findings, and scrutiny records from database.
        </p>
      </div>
    );
  }

  // 2. Unauthorized / Error State (e.g. 403 Forbidden or 404 Not Found)
  if (existingApplicationError) {
    const isForbidden = existingApplicationError.status === 403;
    const isNotFound = existingApplicationError.status === 404;

    return (
      <div className="max-w-[800px] mx-auto px-4 sm:px-8 py-12">
        <div
          className={`border rounded-[3px] p-6 shadow-sm ${
            isForbidden
              ? "bg-[#FEF7EC] border-[#FFE58F] text-[#8D6B00]"
              : isNotFound
              ? "bg-[#FAFAF8] border-[#D7DEDA] text-[#172E33]"
              : "bg-[#FDF2F2] border-[#E8C5C5] text-[#9E2A2B]"
          }`}
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl">{isForbidden ? "🔒" : isNotFound ? "🔍" : "⚠️"}</span>
            <div className="flex-1">
              <h3 className="text-base font-bold m-0 text-[#172E33]">
                {isForbidden
                  ? "Access Restricted: Application Not Assigned to You"
                  : isNotFound
                  ? "Application Not Found"
                  : "Unable to Open Application Workspace"}
              </h3>
              <p className="text-[13px] text-[#5C6F73] mt-1.5 leading-relaxed m-0">
                {isForbidden
                  ? "Under statutory regulatory policies, processing officers can only inspect and evaluate applications explicitly assigned to their desk. This application is assigned to another officer or is in the unassigned oversight queue."
                  : existingApplicationError.message}
              </p>
              <div className="mt-5 flex items-center gap-3">
                <Button
                  type="button"
                  onClick={handleReturnListing}
                  className="bg-[#165A60] hover:bg-[#122B30] text-white text-[12px] font-medium px-4 py-2 rounded-[3px] shadow-sm"
                >
                  {isMinistryAdmin ? "← Return to Portfolio" : "← Return to My Applications"}
                </Button>
                {!isMinistryAdmin && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate("/officer/workbench")}
                    className="text-[12px] font-medium px-4 py-2 border-[#D7DEDA]"
                  >
                    My Workbench
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleStepClick = (stepIndex: 1 | 2 | 3 | 4 | 5) => {
    // Steps 1 & 2 are strictly locked for existing applications
    if (stepIndex >= 3) {
      setCurrentStep(stepIndex);
    }
  };

  const getPageTitle = () => {
    switch (currentStep) {
      case 3:
        return "Extraction & validation";
      case 4:
        return "Review & approve";
      default:
        return "Application Workspace";
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-8 py-6 select-none">
      {/* Top Breadcrumb & Heading Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono tracking-wider uppercase text-[#5C6F73] mb-1 flex items-center gap-1.5">
            {isMinistryAdmin ? (
              <Link to="/ministry/portfolio" className="hover:underline text-[#165A60]">
                PORTFOLIO
              </Link>
            ) : (
              <Link to="/officer/applications" className="hover:underline text-[#165A60]">
                MY APPLICATIONS
              </Link>
            )}
            <span>/</span>
            <span className="font-semibold text-[#172E33]">
              {institutionDetails.applicationNumber || createdApplication?.applicationNumber || "APPLICATION"}
            </span>
            <span>/</span>
            <span>WORKSPACE</span>
          </div>
          <h1 className="text-[28px] font-bold text-[#172E33] tracking-tight m-0">
            {getPageTitle()}
          </h1>
          <p className="text-[13px] text-[#5C6F73] mt-1 m-0">
            {institutionDetails.institutionName ? (
              <>
                Evaluating evidence for{" "}
                <strong className="text-[#172E33]">{institutionDetails.institutionName}</strong>{" "}
                ({institutionDetails.applicationNumber}). Intake records are locked and immutable.
              </>
            ) : (
              "Regulatory case workspace for statutory compliance evaluation and evidence review."
            )}
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={handleReturnListing}
          className="self-start sm:self-center text-[12px] bg-white border-[#D7DEDA] text-[#172E33] px-3.5 py-1.5"
        >
          {isMinistryAdmin ? "← Back to Portfolio" : "← All applications"}
        </Button>
      </div>

      {/* Ministry Oversight Informational Notice */}
      {isMinistryAdmin && (
        <div className="mb-6 p-4 bg-[#EAEFEF] border border-[#165A60]/30 rounded-[3px] text-[#165A60] flex items-start gap-3">
          <span className="text-xl">👁️</span>
          <div>
            <div className="text-[13px] font-bold text-[#172E33]">
              Ministry Oversight &amp; Statutory Audit Mode
            </div>
            <div className="text-[12px] text-[#5C6F73] mt-0.5 leading-relaxed">
              You are inspecting this statutory application with ministry-wide administrative read permissions. All source documents, VLM extraction results, scrutiny outcomes, and audit histories are available for review. In accordance with statutory segregation of duties, evidence corrections, validation status overrides, and approval sign-offs are restricted to assigned processing officers.
            </div>
          </div>
        </div>
      )}

      {/* 5-Stage Stepper Strip: Steps 1 & 2 Visibly Disabled and Locked */}
      <IntakeStepper
        currentStep={currentStep}
        onStepClick={handleStepClick}
        disabledSteps={[1, 2]}
      />

      {/* Dynamic Step Content (Only Steps 3 and 4 accessible in Existing Mode) */}
      {currentStep === 3 && (
        <ExtractionValidationStep onProceedToReview={() => setCurrentStep(4)} />
      )}
      {currentStep === 4 && <ReviewApproveStep />}

      {/* Dedicated Authority & Registry Cross-Verification Track (Separate from submission stepper) */}
      {effectiveAppId && (
        <AuthorityVerificationPanel
          applicationId={effectiveAppId}
          isMinistryAdmin={isMinistryAdmin}
        />
      )}

      {/* Fallback to Step 3 if state somehow drifted to Step 1 or 2 */}
      {currentStep < 3 && (
        <div className="p-6 bg-white border border-[#D7DEDA] rounded-[2px] text-center space-y-3">
          <p className="text-sm text-[#5C6F73] m-0">
            Intake steps 1 and 2 are permanently locked for existing applications.
          </p>
          <Button
            type="button"
            onClick={() => setCurrentStep(3)}
            className="bg-[#165A60] hover:bg-[#122B30] text-white text-[12px] px-4 py-2"
          >
            Go to Extraction &amp; Validation →
          </Button>
        </div>
      )}

      {/* Footer Legal / Disclaimer Note */}
      <div className="text-center text-[11px] text-[#8A9B9D] mt-12 pb-6 border-t border-[#D7DEDA]/40 pt-4">
        Decision support only. Computed findings do not constitute final approval or rejection. All institutions and records shown are synthetic.
      </div>
    </div>
  );
};

export const ExistingApplicationWorkspacePage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();

  return (
    <IntakeProvider existingApplicationId={applicationId}>
      <ExistingApplicationWorkspaceContent />
    </IntakeProvider>
  );
};
