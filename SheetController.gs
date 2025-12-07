const SHEET_NAME = "Caregivers_DB";
const PRIMARY_COLOR = "#65c027";

/**
 * Saves caregiver data and sends the email.
 */
function handleCaregiverSubmission(data) {
  try {
    const sheet = getOrCreateSheet();
    
    // 1. Generate Auto ID (e.g., CG-1001)
    const lastRow = sheet.getLastRow();
    let newId = "CG-1001"; // Default start
    
    if (lastRow > 1) {
      const lastIdStr = sheet.getRange(lastRow, 1).getValue();
      // Extract number and increment
      const lastNum = parseInt(lastIdStr.split("-")[1]);
      newId = "CG-" + (lastNum + 1);
    }
    
    const timestamp = new Date();
    
    // 2. Save to Sheet
    sheet.appendRow([
      newId,
      data.firstName,
      data.lastName,
      data.phone,
      data.email,
      data.title,
      data.status,
      timestamp,
      "Application Sent" // Application Status
    ]);
    
    // 3. Send Email
    sendRecruitmentEmail(data, newId);
    
    return { success: true, message: "Caregiver saved and email sent successfully!", id: newId };
    
  } catch (e) {
    return { success: false, message: "Error: " + e.toString() };
  }
}

/**
 * setup the spreadsheet if it doesn't exist
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Create Headers
    const headers = ["Caregiver ID", "First Name", "Last Name", "Phone", "Email", "Title", "Status", "Created At", "App Status"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Style Headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground(PRIMARY_COLOR)
               .setFontColor("white")
               .setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Gets dashboard stats for the frontend
 */
function getDashboardStats() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) return { total: 0, active: 0, inactive: 0, stna: 0 };
  
  const data = sheet.getRange(2, 6, lastRow - 1, 2).getValues(); // Get Title (Col 6) and Status (Col 7)
  
  let stats = { total: data.length, active: 0, inactive: 0, stna: 0 };
  
  data.forEach(row => {
    if (row[1] === 'Active') stats.active++;
    if (row[1] === 'Inactive') stats.inactive++;
    if (row[0] === 'STNA') stats.stna++;
  });
  
  return stats;
}