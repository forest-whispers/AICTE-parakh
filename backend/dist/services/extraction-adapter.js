export function makeEmptyField(sourceKey = "unknown") {
    return {
        state: "NOT_FOUND",
        value: null,
        rawText: null,
        pageNumber: null,
        excerpt: null,
        uncertaintyReason: null,
        sourceKey,
    };
}
export function extractField(container, candidateKeys, transform) {
    if (!container || typeof container !== "object") {
        return makeEmptyField(candidateKeys[0] || "unknown");
    }
    for (const key of candidateKeys) {
        // Check nested or flat
        const fieldObj = container[key];
        if (fieldObj && typeof fieldObj === "object" && "state" in fieldObj) {
            const rawVal = fieldObj.value;
            const transformedVal = transform && rawVal !== null && rawVal !== undefined
                ? transform(rawVal)
                : (rawVal ?? null);
            return {
                state: fieldObj.state || (rawVal !== null && rawVal !== undefined ? "PRESENT" : "NOT_FOUND"),
                value: transformedVal,
                rawText: fieldObj.rawText ?? null,
                pageNumber: fieldObj.pageNumber ?? null,
                excerpt: fieldObj.excerpt ?? null,
                uncertaintyReason: fieldObj.uncertaintyReason ?? null,
                sourceKey: key,
            };
        }
    }
    return makeEmptyField(candidateKeys[0] || "unknown");
}
// Adapters to construct normalized models from VLM output containers
export function adaptDoc01(container) {
    return {
        entityType: extractField(container, ["entityType"]),
        trustSocietyName: extractField(container, ["trustSocietyName", "applicantLegalName", "applicantName"]),
        registrationNumber: extractField(container, ["registrationNumber"]),
        registrationDate: extractField(container, ["registrationDate"]),
        registeringAuthority: extractField(container, ["registeringAuthority"]),
        registeredAddress: extractField(container, ["registeredAddress"]),
        hasNonProfitClause: extractField(container, ["hasNonProfitClause"]),
    };
}
export function adaptDoc02(container) {
    return {
        trustSocietyName: extractField(container, ["trustSocietyName", "sponsoringBodyName", "applicantName"]),
        proposedInstitutionName: extractField(container, ["proposedInstitutionName"]),
        resolutionDate: extractField(container, ["resolutionDate"]),
        resolutionNumber: extractField(container, ["resolutionNumber", "resolutionReferenceNumber"]),
        locationAddress: extractField(container, ["locationAddress", "siteAddress"]),
        authorizedSignatories: extractField(container, ["authorizedSignatories"]),
        proposedCoursesIntake: extractField(container, ["proposedCoursesIntake", "programmesStated"]),
    };
}
export function adaptDoc03(container) {
    return {
        documentType: extractField(container, ["documentType", "deedType"]),
        landLocation: extractField(container, ["landLocation", "landRevenueLocation", "siteAddress"]),
        khasraNumbers: extractField(container, ["khasraNumbers", "khasraSurveyPlotNumbers"]),
        landAreaAcres: extractField(container, ["landAreaAcres", "parcelArea"]),
        buyerTransferee: extractField(container, ["buyerTransferee", "transfereeLesseeName"]),
        sellerTransferor: extractField(container, ["sellerTransferor", "transferorLessorName"]),
        registrationNumber: extractField(container, ["registrationNumber", "deedRegistrationNumber"]),
        registrationDate: extractField(container, ["registrationDate"]),
        registrarOffice: extractField(container, ["registrarOffice"]),
        leaseTenureYears: extractField(container, ["leaseTenureYears", "leasePeriodYears", "leaseDurationYears"]),
        leaseExpiryDate: extractField(container, ["leaseExpiryDate"]),
        leaseCommencementDate: extractField(container, ["leaseCommencementDate"]),
    };
}
export function adaptDoc04(container) {
    return {
        deponentName: extractField(container, ["deponentName"]),
        isApplicable: extractField(container, ["isApplicable"]),
        executionDate: extractField(container, ["executionDate"]),
        khasraNumbers: extractField(container, ["khasraNumbers"]),
        placeOfExecution: extractField(container, ["placeOfExecution"]),
        trustSocietyName: extractField(container, ["trustSocietyName", "sponsoringBodyName"]),
        hasIrrevocableCommitment: extractField(container, ["hasIrrevocableCommitment"]),
    };
}
export function adaptDoc05(container) {
    return {
        issueDate: extractField(container, ["issueDate", "orderDate"]),
        orderNumber: extractField(container, ["orderNumber", "orderReferenceNumber"]),
        landLocation: extractField(container, ["landLocation", "siteAddress"]),
        permittedUse: extractField(container, ["permittedUse", "permittedLandUse"]),
        applicantName: extractField(container, ["applicantName", "landownerApplicantName"]),
        khasraNumbers: extractField(container, ["khasraNumbers", "khasraSurveyPlotNumbers"]),
        landAreaAcres: extractField(container, ["landAreaAcres"]),
        issuingAuthority: extractField(container, ["issuingAuthority"]),
    };
}
export function adaptDoc06(container) {
    // Support nested carpetAreaSummary or flat fields
    const adminCarpet = extractField(container, ["adminCarpetAreaSqm"], (val) => Number(val));
    const amenitiesCarpet = extractField(container, ["amenitiesCarpetAreaSqm"], (val) => Number(val));
    const totalArea = extractField(container, ["totalBuiltUpAreaSqm", "totalSanctionedBuiltUpArea"], (val) => Number(val));
    // If nested carpetAreaSummary was populated instead of flat fields
    if (adminCarpet.state !== "PRESENT" && container?.carpetAreaSummary?.value?.administrativeSqM) {
        adminCarpet.state = "PRESENT";
        adminCarpet.value = container.carpetAreaSummary.value.administrativeSqM;
        adminCarpet.rawText = String(container.carpetAreaSummary.value.administrativeSqM);
    }
    if (amenitiesCarpet.state !== "PRESENT" && container?.carpetAreaSummary?.value?.amenitiesSqM) {
        amenitiesCarpet.state = "PRESENT";
        amenitiesCarpet.value = container.carpetAreaSummary.value.amenitiesSqM;
        amenitiesCarpet.rawText = String(container.carpetAreaSummary.value.amenitiesSqM);
    }
    return {
        farFsi: extractField(container, ["farFsi", "statedFarFsi"], (val) => Number(val)),
        siteAddress: extractField(container, ["siteAddress", "institutionSiteAddress"]),
        sanctionDate: extractField(container, ["sanctionDate"]),
        architectName: extractField(container, ["architectName"]),
        sanctionNumber: extractField(container, ["sanctionNumber", "sanctionOrderReference"]),
        institutionName: extractField(container, ["institutionName"]),
        adminCarpetAreaSqm: adminCarpet,
        amenitiesCarpetAreaSqm: amenitiesCarpet,
        totalBuiltUpAreaSqm: totalArea,
        sanctioningAuthority: extractField(container, ["sanctioningAuthority", "approvingAuthority"]),
        architectCoaRegistration: extractField(container, ["architectCoaRegistration", "architectCoaRegistrationNumber"]),
    };
}
export function adaptDoc07(container) {
    return {
        issueDate: extractField(container, ["issueDate"]),
        siteAddress: extractField(container, ["siteAddress", "campusPhysicalSiteAddress"]),
        occupancyType: extractField(container, ["occupancyType", "occupancyStatus"]),
        buildingDetails: extractField(container, ["buildingDetails", "coveredBuildingsFloors"]),
        institutionName: extractField(container, ["institutionName", "institutionNameReferenced"]),
        issuingAuthority: extractField(container, ["issuingAuthority"]),
        certificateNumber: extractField(container, ["certificateNumber", "referenceNumber"]),
        expiryDate: extractField(container, ["expiryDate"]),
    };
}
export function adaptDoc08(container) {
    return {
        reviewDate: extractField(container, ["reviewDate", "expiryDate"]),
        siteAddress: extractField(container, ["siteAddress"]),
        engineerName: extractField(container, ["engineerName", "issuingEngineerName"]),
        inspectionDate: extractField(container, ["inspectionDate", "issueDate"]),
        stabilityStatus: extractField(container, ["stabilityStatus", "structuralFitnessConclusion"]),
        buildingAgeYears: extractField(container, ["buildingAgeYears"], (val) => Number(val)),
        certificateNumber: extractField(container, ["certificateNumber", "certificateReferenceNumber"]),
        engineerQualifications: extractField(container, ["engineerQualifications", "engineerQualification"]),
        expiryDate: extractField(container, ["expiryDate", "reviewDate"]),
    };
}
export function adaptDoc09(container) {
    return {
        issueDate: extractField(container, ["issueDate"]),
        expiryDate: extractField(container, ["expiryDate"]),
        siteAddress: extractField(container, ["siteAddress", "campusPhysicalSiteAddress"]),
        buildingDetails: extractField(container, ["buildingDetails", "coveredBuildingsFloors"]),
        institutionName: extractField(container, ["institutionName", "institutionNameReferenced"]),
        issuingAuthority: extractField(container, ["issuingAuthority"]),
        certificateNumber: extractField(container, ["certificateNumber", "certificateReferenceNumber"]),
    };
}
export function adaptDoc10(container) {
    const inrField = extractField(container, ["amountInInr"], (val) => Number(val));
    const lakhsField = extractField(container, ["amountInLakhsINR"], (val) => Number(val));
    // Cross-compute: if amountInInr is present (e.g. 12500000), compute amountInLakhsINR = 125
    if (inrField.state === "PRESENT" && inrField.value !== null) {
        if (lakhsField.state !== "PRESENT" || lakhsField.value === null) {
            lakhsField.state = "PRESENT";
            lakhsField.value = inrField.value / 100000;
            lakhsField.rawText = inrField.rawText;
            lakhsField.pageNumber = inrField.pageNumber;
            lakhsField.excerpt = inrField.excerpt;
        }
    }
    else if (lakhsField.state === "PRESENT" && lakhsField.value !== null) {
        if (inrField.state !== "PRESENT" || inrField.value === null) {
            inrField.state = "PRESENT";
            inrField.value = lakhsField.value * 100000;
            inrField.rawText = lakhsField.rawText;
        }
    }
    return {
        bankName: extractField(container, ["bankName"]),
        branchName: extractField(container, ["branchName"]),
        ifscCode: extractField(container, ["ifscCode"]),
        accountHolderName: extractField(container, ["accountHolderName"]),
        amountInInr: inrField,
        amountInLakhsINR: lakhsField,
        fdrNumber: extractField(container, ["fdrNumber", "accountOrFdrNumber"]),
        maturityDate: extractField(container, ["maturityDate", "fdrMaturityDate"]),
        certificateDate: extractField(container, ["certificateDate", "issueDate"]),
        isUnencumbered: extractField(container, ["isUnencumbered", "isStatedUnencumbered"]),
        lienStatement: extractField(container, ["lienStatement"]),
    };
}
export function adaptDoc11(container) {
    return {
        deponentName: extractField(container, ["deponentName"]),
        executionDate: extractField(container, ["executionDate"]),
        placeOfExecution: extractField(container, ["placeOfExecution"]),
        trustSocietyName: extractField(container, ["trustSocietyName", "sponsoringBodyName"]),
        proposedInstitutionName: extractField(container, ["proposedInstitutionName"]),
    };
}
export function adaptDoc14(container) {
    return {
        latitude: extractField(container, ["latitude"], (val) => Number(val)),
        longitude: extractField(container, ["longitude"], (val) => Number(val)),
        siteAddress: extractField(container, ["siteAddress"]),
        khasraNumbers: extractField(container, ["khasraNumbers"]),
        proposedInstitutionName: extractField(container, ["proposedInstitutionName"]),
    };
}
//# sourceMappingURL=extraction-adapter.js.map