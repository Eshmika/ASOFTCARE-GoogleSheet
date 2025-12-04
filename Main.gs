// Main.gs - Setup and HTML serving

function doGet() {
  return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Care Admin Panel')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Crucial Helper: Allows us to include CSS/JS files in HTML
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Shared Helper: Get the Sheet
function getSheet() {
  const SHEET_NAME = 'Clients';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Add Headers logic can remain here or be moved to a setup script
    // For brevity, assuming headers exist or are created on first save
  }
  return sheet;
}