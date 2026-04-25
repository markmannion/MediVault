# MediVault Demo Data

This file contains sample data you can use to test MediVault's features.

## Demo Credentials

**Master Password**: `demo-patient-2025`

## Sample Medical Records

### 1. Lab Results - Blood Panel

```json
{
  "title": "Full Blood Panel Q1 2025",
  "category": "lab_results",
  "date": "2025-01-03",
  "description": "Annual routine blood work - all values normal",
  "tags": ["routine", "annual", "2025"],
  "fhirResource": {
    "resourceType": "DiagnosticReport",
    "status": "final",
    "code": { "text": "Complete Blood Count" },
    "effectiveDateTime": "2025-01-03",
    "result": [
      { "display": "Hemoglobin: 14.2 g/dL (normal)" },
      { "display": "White Blood Cell Count: 7.5 K/uL (normal)" },
      { "display": "Platelets: 250 K/uL (normal)" },
      { "display": "Red Blood Cell Count: 4.8 M/uL (normal)" }
    ]
  }
}
```

### 2. Imaging - Chest X-Ray

```json
{
  "title": "Chest X-Ray - Annual Checkup",
  "category": "imaging",
  "date": "2024-12-15",
  "description": "Routine chest radiograph - no abnormalities detected",
  "tags": ["routine", "radiology", "clear"],
  "notes": "PA and lateral views obtained. Lungs are clear. Heart size normal. No acute findings."
}
```

### 3. Cardiology - ECG Report

```json
{
  "title": "12-Lead ECG",
  "category": "cardiology",
  "date": "2024-11-20",
  "description": "Electrocardiogram showing normal sinus rhythm",
  "tags": ["routine", "cardiac", "NSR"],
  "fhirResource": {
    "resourceType": "Observation",
    "status": "final",
    "code": { "text": "12-lead ECG" },
    "valueString": "Normal sinus rhythm, rate 72 bpm, PR interval 160ms, QRS 90ms, QT/QTc 400/420ms"
  }
}
```

### 4. Vaccination Record

```json
{
  "title": "COVID-19 Booster - Moderna",
  "category": "vaccination",
  "date": "2024-10-01",
  "description": "COVID-19 mRNA booster vaccine administered",
  "tags": ["covid", "booster", "moderna"],
  "fhirResource": {
    "resourceType": "Immunization",
    "status": "completed",
    "vaccineCode": { "text": "COVID-19, mRNA, LNP-S, PF, 100 mcg/0.5mL dose" },
    "occurrenceDateTime": "2024-10-01",
    "lotNumber": "EN6201",
    "site": { "text": "Left deltoid" }
  }
}
```

## Sample Doctors

### Dr. Clara Chen - Cardiologist
```json
{
  "name": "Dr. Clara Chen",
  "specialty": "Cardiology",
  "institution": "Hospital Clínic Barcelona",
  "email": "c.chen@hospitalclinic.org"
}
```

### Dr. Miguel Ramírez - General Practitioner
```json
{
  "name": "Dr. Miguel Ramírez",
  "specialty": "General Practice",
  "institution": "CAP Les Corts",
  "email": "m.ramirez@capsalut.cat"
}
```

### Dr. Sarah Thompson - Endocrinologist
```json
{
  "name": "Dr. Sarah Thompson",
  "specialty": "Endocrinology",
  "institution": "Hospital del Mar",
  "email": "s.thompson@hospitaldelmar.cat"
}
```

## Sample Share Scenarios

### Scenario 1: Share blood work with cardiologist (7-day expiry)
- Records: Blood Panel, ECG Report
- Doctor: Dr. Clara Chen
- Expiry: 7 days
- Download: Not allowed

### Scenario 2: Share imaging with GP (30-day expiry)
- Records: Chest X-Ray
- Doctor: Dr. Miguel Ramírez
- Expiry: 30 days
- Download: Allowed

### Scenario 3: Share vaccination record (no expiry)
- Records: COVID-19 Booster
- Doctor: Dr. Sarah Thompson
- Expiry: None
- Download: Allowed

## FHIR Bundle Example

Create a file `sample-fhir-bundle.json`:

```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "entry": [
    {
      "resource": {
        "resourceType": "DiagnosticReport",
        "id": "blood-panel-2025-01",
        "status": "final",
        "code": {
          "coding": [{
            "system": "http://loinc.org",
            "code": "58410-2",
            "display": "Complete blood count (hemogram) panel"
          }]
        },
        "effectiveDateTime": "2025-01-03T09:30:00Z",
        "result": [
          {
            "reference": "Observation/hemoglobin-2025-01"
          },
          {
            "reference": "Observation/wbc-2025-01"
          }
        ]
      }
    },
    {
      "resource": {
        "resourceType": "Observation",
        "id": "hemoglobin-2025-01",
        "status": "final",
        "code": {
          "coding": [{
            "system": "http://loinc.org",
            "code": "718-7",
            "display": "Hemoglobin"
          }]
        },
        "valueQuantity": {
          "value": 14.2,
          "unit": "g/dL"
        }
      }
    }
  ]
}
```

## Testing Workflow

### 1. First-Time Setup
1. Launch MediVault
2. Create vault with password: `demo-patient-2025`
3. You'll see the empty vault dashboard

### 2. Add Sample Data
1. Click "Upload Records"
2. Create records using the JSON samples above
3. Optionally attach PDF files (any PDF will work for testing)

### 3. Add Doctors
1. Go to "My Doctors"
2. Add the three sample doctors above

### 4. Create Shares
1. Go to "Sharing"
2. Click "+ New Share"
3. Select a doctor and 1-3 records
4. Set expiration (e.g., 7 days)
5. Click "Generate Encrypted Link"
6. Copy the generated link

### 5. Test Doctor View
1. Open the copied link in a new incognito window
2. You'll see the share viewer interface
3. Click "View Record" to decrypt and view

### 6. Check Audit Log
1. Go to "Audit Log"
2. See all create/share/access events

## Production Deployment Checklist

- [ ] Change default master password
- [ ] Set up HTTPS for doctor portal
- [ ] Configure CORS for share links
- [ ] Add doctor public key verification (QR codes)
- [ ] Implement P2P sync for multi-device
- [ ] Set up automated vault backups
- [ ] Add 2FA for vault unlock
- [ ] Integrate with EHR systems via FHIR API
- [ ] Add DICOM viewer for medical imaging
- [ ] Implement HL7 v2 message parser
- [ ] Set up HIPAA compliance audit trails
- [ ] Configure encrypted vault export/import
