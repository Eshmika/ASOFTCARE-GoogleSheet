const SHEET_NAME = "Caregivers_DB";
const PRIMARY_COLOR = "#65c027";

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // EXPANDED HEADERS for the full application
    const headers = [
      "Caregiver ID", "First Name", "Last Name", "Phone", "Email", "Title", "Status", 
      "Created At", "App Status", // Admin Columns (A-I)
      "Address", "City", "Zip", "SSN (Last 4)", "Experience (Yrs)", "Certifications", "Agreed to Policy" // App Columns (J-P)
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setBackground(PRIMARY_COLOR).setFontColor("white").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ADMIN CREATES CAREGIVER
function handleCaregiverSubmission(data) {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  let newId = "CG-1001";
  
  if (lastRow > 1) {
    const lastIdStr = sheet.getRange(lastRow, 1).getValue();
    const lastNum = parseInt(lastIdStr.split("-")[1]);
    newId = "CG-" + (lastNum + 1);
  }
  
  sheet.appendRow([
    newId, data.firstName, data.lastName, data.phone, data.email, 
    data.title, data.status, new Date(), "Pending Application"
  ]);
  
  sendRecruitmentEmail(data, newId); // Send email with the magic link
  return { success: true, message: "Sent!", id: newId };
}

// CAREGIVER FILLS APPLICATION (UPDATES ROW)
function submitFullApplication(formObject) {
  try {
    const sheet = getOrCreateSheet();
    const id = formObject.caregiverId; // Hidden field in form
    
    // Find the row with this ID
    const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    const rowIndex = ids.indexOf(id); // 0-based index relative to data range
    
    if (rowIndex === -1) return { success: false, message: "ID not found" };
    
    const actualRow = rowIndex + 2; // +2 because header is row 1 and index is 0-based
    
    // Update Columns J through P (cols 10 to 16)
    // Map form fields to columns
    const updateRange = sheet.getRange(actualRow, 9, 1, 8); // Start at col 9 (App Status)
    
    updateRange.setValues([[
      "Application Completed", // App Status
      formObject.address,
      formObject.city,
      formObject.zip,
      formObject.ssn,
      formObject.experience,
      formObject.certs,
      "Yes" // Agreed to policy
    ]]);
    
    return { success: true };
    
  } catch (e) {
    return { success: false, message: e.toString() };
  }
}

function getDashboardStats() {
  const sheet = getOrCreateSheet();
  if (sheet.getLastRow() <= 1) return { total: 0, completed: 0 };
  
  const data = sheet.getRange(2, 9, sheet.getLastRow()-1, 1).getValues(); // Get App Status col
  let completed = 0;
  data.forEach(r => { if(r[0] === 'Application Completed') completed++; });
  
  return { total: data.length, completed: completed };
}