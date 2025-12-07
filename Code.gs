/**
 * Serves the HTML file for the web app.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Senior Care Admin Panel')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Helper to include other HTML files inside the main index.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}