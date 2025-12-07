/**
 * Serves the HTML file for the web app.
 * If URL has ?page=apply&id=CG-xxxx, it shows the Application Form.
 */
function doGet(e) {
  if (e.parameter.page === 'apply' && e.parameter.id) {
    const isValid = validateCaregiverId(e.parameter.id);
    if (isValid) {
      var template = HtmlService.createTemplateFromFile('page-public-application');
      template.caregiverId = e.parameter.id;
      return template.evaluate()
        .setTitle('Application - Allevia Senior Care')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    } else {
      return HtmlService.createHtmlOutput("<h1 style='font-family:sans-serif; text-align:center; margin-top:50px;'>Error: Invalid or Expired Application Link.</h1>");
    }
  }
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Senior Care Admin Panel')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Helper to check if ID exists in Sheet (Called by doGet)
function validateCaregiverId(id) {
  const sheet = getOrCreateSheet();
  const ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  return ids.includes(id);
}