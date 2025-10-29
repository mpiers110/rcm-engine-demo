import { TechnicalRule } from "@/types/technical-rule";

 export const parseTechnicalRules = (text: string) => {
    const data: Omit<TechnicalRule, 'id' | 'isActive' | 'ownerId' | 'ruleSetId'> = {
      title: '',
      framing: '',
      type: 'TECHNICAL',
      serviceApprovals: [],
      diagnosisApprovals: [],
      paidAmountThreshold: {
        threshold: 0,
        description: ''
      },
      idFormattingRules: {
        idFormat: '',
        uniqueIdStructure: '',
        requirements: []
      }
    };

    // Extract title
    const titleMatch = text.match(/Technical Adjudication & Submission Guide[^\n]*/i);
    if (titleMatch) {
      data.title = titleMatch[0].trim();
    }

    // Extract framing text
    const framingMatch = text.match(/Framing:(.*?)(?=1\)|Services Requiring)/is);
    if (framingMatch) {
      data.framing = framingMatch[1].trim().replace(/\s+/g, ' ');
    }

    // Section 1: Services Requiring Prior Approval
    const section1Match = text.match(/1\)\s*Services Requiring Prior Approval(.*?)(?=2\)|Diagnosis Codes Requiring)/is);
    if (section1Match) {
      const content = section1Match[1];
      
      // Extract table data - match service codes with descriptions and approval status
      const serviceMatches = content.matchAll(/(?:SRV)?(\d{4})\s+([^\n\t]+?)(?:\s+|\t+)(YES|NO)/gi);
      
      for (const match of serviceMatches) {
        const serviceID = 'SRV' + match[1];
        const description = match[2].trim();
        const approvalRequired = match[3].toUpperCase() === 'YES';
        
        if (description && description.length > 2) {
          data.serviceApprovals.push({
            serviceID,
            description,
            approvalRequired
          });
        }
      }
    }

    // Section 2: Diagnosis Codes Requiring Approval
    const section2Match = text.match(/2\)\s*Diagnosis Codes Requiring Approval(.*?)(?=3\)|Paid Amount Threshold)/is);
    if (section2Match) {
      const content = section2Match[1];
      
      // Extract diagnosis codes with names and approval status
      const diagnosisMatches = content.matchAll(/([A-Z]\d{2,3}(?:\.\d+)?)\s+([^\n\t]+?)(?:\s+|\t+)(YES|NO)/gi);
      
      for (const match of diagnosisMatches) {
        const code = match[1];
        const diagnosis = match[2].trim();
        const approvalRequired = match[3].toUpperCase() === 'YES';
        
        if (diagnosis && diagnosis.length > 2) {
          data.diagnosisApprovals.push({
            code,
            diagnosis,
            approvalRequired
          });
        }
      }
    }

    // Section 3: Paid Amount Threshold
    const section3Match = text.match(/3\)\s*Paid Amount Threshold(.*?)(?=4\)|ID & Unique ID Formatting|$)/is);
    if (section3Match) {
      const content = section3Match[1];
      
      // Extract threshold amount - look for AED followed by number
      const thresholdMatch = content.match(/AED\s*(\d+)/i);
      if (thresholdMatch) {
        data.paidAmountThreshold.threshold = parseInt(thresholdMatch[1]);
      }
      
      // Extract the main rule description (first sentence)
      const mainRuleMatch = content.match(/Any claim with[^.]+\./i);
      if (mainRuleMatch) {
        data.paidAmountThreshold.description = mainRuleMatch[0].trim();
      }
      
      // If no main rule found, try to get full content up to next section
      if (!data.paidAmountThreshold.description) {
        const fullDescMatch = content.match(/Any claim with.*?(?=\n\n|4\)|$)/is);
        if (fullDescMatch) {
          data.paidAmountThreshold.description = fullDescMatch[0].trim().replace(/\s+/g, ' ');
        }
      }
    }

    // Section 4: ID & Unique ID Formatting
    const section4Match = text.match(/4\)\s*ID & Unique ID Formatting(.*?)$/is);
    if (section4Match) {
      const content = section4Match[1];
      
      // Extract ID format requirement
      const idFormatMatch = content.match(/All IDs must be\s+([^.]+)/i);
      if (idFormatMatch) {
        data.idFormattingRules.idFormat = idFormatMatch[1].trim();
      }
      
      // Extract unique_id structure with more flexible pattern
      const structureMatch = content.match(/unique[_\s]id structure[:\s]+([^.]+?)(?:\.|•|\n|$)/i);
      if (structureMatch) {
        data.idFormattingRules.uniqueIdStructure = structureMatch[1].trim();
      }
      
      // Extract all bullet points as requirements
      const requirementMatches = content.matchAll(/•\s*([^\n•]+)/g);
      for (const match of requirementMatches) {
        const requirement = match[1].trim();
        if (requirement.length > 5) {
          data.idFormattingRules.requirements.push(requirement);
        }
      }
      
      // If requirements array is empty, try to extract from the combined text
      if (data.idFormattingRules.requirements.length === 0) {
        // Try to extract from section 3 if it was combined
        const combinedIdRules = text.match(/All IDs must be UPPERCASE.*?(?=\n\n|$)/is);
        if (combinedIdRules) {
          const rules = combinedIdRules[0].split(/[.•]/).filter(r => r.trim().length > 10);
          data.idFormattingRules.requirements = rules.map(r => r.trim());
        }
      }
    }

    return data;
  };