import { MedicalRule } from "@/types/medical-rule";

export const parseExtractedText = (text: string) => {
    const data: Omit<MedicalRule, 'id'|'isActive'|'ownerId'> = {
      title: '',
      framing: '',
      type: 'MEDICAL',
      encounterTypes: { inpatient: [], outpatient: [] },
      facilityTypes: [],
      facilityRegistry: [],
      diagnosisRequirements: [],
      mutuallyExclusiveDiagnoses: [],
    };

    // Extract title
    const titleMatch = text.match(/Medical Adjudication Guide[^\n]*/i);
    if (titleMatch) {
      data.title = titleMatch[0].trim();
    }

    // Extract framing text - improved to capture full text
    const framingMatch = text.match(/Framing:\s*([^]*?)(?=A\.|Inpatient-only services|Services limited)/i);
    if (framingMatch) {
      data.framing = framingMatch[1].trim().replace(/\s+/g, ' ');
    }

    // Extract encounter types
  const sectionA = text.match(/A\.\s*Services limited by Encounter Type(.*?)(?=B\.|$)/is);

  if (sectionA) {
  const content = sectionA[1];
  const inpatientMatch = content.match(/Inpatient-only services:(.*?)(?=Outpatient-only services:|$)/is);
  const outpatientMatch = content.match(/Outpatient-only services:(.*?)(?=B\.|$)/is);

  // Parse inpatient services
  if (inpatientMatch) {
    const inpatientText = inpatientMatch[1];
    const serviceMatches = inpatientText.matchAll(/•?\s*(SRV\d{4})\s+([^\n•]+)/g);
    
    for (const match of serviceMatches) {
      data.encounterTypes.inpatient.push({
        code: match[1],
        description: match[2].trim()
      });
    }
  }

  // Parse outpatient services
  if (outpatientMatch) {
    const outpatientText = outpatientMatch[1];
    const serviceMatches = outpatientText.matchAll(/•?\s*(SRV\d{4})\s+([^\n•]+)/g);
    
    for (const match of serviceMatches) {
        data.encounterTypes.outpatient.push({
            code: match[1],
            description: match[2].trim()
          });
    }
  }
  }


    // Extract facility types - improved pattern matching
    const facilityMatches = text.matchAll(/([A-Z_]+(?:_[A-Z]+)*)\s*[:\s]+\s*((?:SRV\d+[,\s]*)+)/g);
    
    const facilityMap = new Map();
    for (const match of facilityMatches) {
      const facilityType = match[1].replace(/_/g, ' ');
      const services = match[2].match(/SRV\d+/g) || [];
      
      if (services.length > 0 && facilityType !== 'DIALYSIS CENTER') { // Avoid partial matches
        if (facilityMap.has(facilityType)) {
          const existing = facilityMap.get(facilityType);
          facilityMap.set(facilityType, [...new Set([...existing, ...services])]);
        } else {
          facilityMap.set(facilityType, services);
        }
      }
    }

    // Convert map to array
    facilityMap.forEach((services, facilityType) => {
      data.facilityTypes.push({
        facilityType: facilityType,
        allowedServices: [...new Set(services)].sort() as string[]
      });
    });

    // Alternative parsing for facility types if above didn't work
    if (data.facilityTypes.length === 0) {
      const facilitySection = text.match(/B\.\s*Services limited by Facility Type(.*?)(?=Facility Registry|$)/is);
      if (facilitySection) {
        const lines = facilitySection[1].split('\n');
        let currentFacility: any = null;
        let currentServices: any = [];

        lines.forEach(line => {
          const facilityMatch = line.match(/([A-Z][A-Z_\s]+?)(?=\s*SRV|\s*$)/);
          const serviceMatch = line.match(/SRV\d+/g);

          if (facilityMatch && serviceMatch) {
            if (currentFacility) {
              data.facilityTypes.push({
                facilityType: currentFacility,
                allowedServices: [...new Set(currentServices)].sort() as string[]
              });
            }
            currentFacility = facilityMatch[1].trim().replace(/_/g, ' ');
            currentServices = serviceMatch;
          } else if (serviceMatch && currentFacility) {
            currentServices.push(...serviceMatch);
          }
        });

        if (currentFacility && currentServices.length > 0) {
          data.facilityTypes.push({
            facilityType: currentFacility,
            allowedServices: [...new Set(currentServices)].sort() as string[]
          });
        }
      }
    }

    // Extract facility registry - improved pattern
    const registryMatches = text.matchAll(/([A-Z0-9]{6,10})\s+([A-Z_]+(?:_[A-Z]+)*)/g);
    
    for (const match of registryMatches) {
      const id = match[1];
      const type = match[2].replace(/_/g, ' ');
      
      // Filter out false matches (like SRV codes or other non-facility IDs)
      if (!id.startsWith('SRV') && type.length > 3 && id.length >= 6) {
        data.facilityRegistry.push({
          id: id,
          type: type
        });
      }
    }

    // Alternative registry parsing
    if (data.facilityRegistry.length === 0) {
      const registrySection = text.match(/Facility Registry.*?present in claims\)(.*?)$/is);
      if (registrySection) {
        const lines = registrySection[1].split('\n');
        lines.forEach(line => {
          const match = line.match(/([A-Z0-9]{6,10})\s+([A-Z_]+)/);
          if (match && !match[1].startsWith('SRV')) {
            data.facilityRegistry.push({
              id: match[1],
              type: match[2].replace(/_/g, ' ')
            });
          }
        });
      }
    }

    // Extract Section C
  const sectionC = text.match(/C\.\s*Services requiring specific Diagnoses(.*?)(?=D\.|$)/is);
  if (sectionC) {
  const sectionCContent = sectionC[1];
  
  // Match pattern: • CODE Description: SRV#### Service Name
  const diagnosisMatches = sectionCContent.matchAll(/•?\s*([A-Z]\d{2}(?:\.\d+)?)\s+([^:]+):\s*(SRV\d{4})\s+([^\n•]+)/g);
  
  for (const match of diagnosisMatches) {
    data.diagnosisRequirements.push({
      diagnosisCode: match[1],
      diagnosisName: match[2].trim(),
      serviceID: match[3],
      serviceName: match[4].trim()
    });
  }
  };



  // Extract Section D
  const sectionD = text.match(/D\.\s*Mutually Exclusive Diagnoses.*?\(Error if co-present\)(.*?)$/is);
  if (sectionD) {
  const sectionDContent = sectionD[1];
  
  // Match pattern: • CODE1 Name1 cannot coexist with CODE2 Name2
  const exclusionMatches = sectionDContent.matchAll(/•?\s*([A-Z]\d{2}(?:\.\d+)?)\s+([^c]+?)\s+cannot coexist with\s+([A-Z]\d{2}(?:\.\d+)?)\s+([^\n•]+)/gi);
  
  for (const match of exclusionMatches) {
    data.mutuallyExclusiveDiagnoses.push({
      diagnosis1Code: match[1],
      diagnosis1Name: match[2].trim(),
      diagnosis2Code: match[3],
      diagnosis2Name: match[4].trim()
    });
  }
  };


    return data;
  };