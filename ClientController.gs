const CLIENT_SHEET_NAME = "Clients_DB";

function getOrCreateClientSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CLIENT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CLIENT_SHEET_NAME);
    const headers = [
      "Client ID",
      "Contact Date",
      "Free Assessment Date/Time",
      "Coordinator",
      "Representative Name",
      "Representative Phone",
      "Created At",
      "Last Reviewed",
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setBackground("#65c027")
      .setFontColor("white")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    // Migration: Check if we need to migrate from old schema to new schema
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];

    // If old schema detected (has "First Name" column), we keep it as-is
    // New clients will use the new simplified schema
    if (!headers.includes("Contact Date") && headers.includes("First Name")) {
      // This is the old schema - we don't modify it
      // Future: You could add migration logic here if needed
    }
  }
  return sheet;
}

function handleClientSubmission(data) {
  const sheet = getOrCreateClientSheet();
  const lastRow = sheet.getLastRow();

  // Generate ID: CL + Random 4 digits
  // Example: CL1234
  const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 digit random
  const newId = `CL${randomPart}`;

  // Format Array for Sheet
  const rowData = [
    newId,
    data.contactDate,
    data.assessmentDateTime,
    data.coordinator,
    data.repName,
    data.repPhone,
    new Date(),
    new Date(), // Initial Last Reviewed
  ];

  sheet.appendRow(rowData);
  return {
    success: true,
    message: "Client information saved successfully!",
    id: newId,
  };
}

function getClientList() {
  const sheet = getOrCreateClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // Get all data as text
  const data = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getDisplayValues();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const reviewIdx = headers.indexOf("Last Reviewed");

  return data
    .filter((row) => row[0] !== "")
    .map((row) => ({
      id: row[0],
      name: row[4] || "Unknown", // Representative Name
      email: "--",
      phone: row[5] || "--", // Representative Phone
      status: "Pending",
      type: "Initial Contact",
      city: "--",
      zip: "--",
      lastReviewed: reviewIdx > -1 ? row[reviewIdx] : "--",
    }))
    .reverse();
}

function getClientDetails(id) {
  const sheet = getOrCreateClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  const maxCols = sheet.getLastColumn();
  const data = sheet.getRange(2, 1, lastRow - 1, maxCols).getDisplayValues();
  const row = data.find((r) => r[0] === id);

  if (!row) return null;

  // Return data based on new simplified schema
  return {
    id: row[0],
    contactDate: row[1],
    assessmentDateTime: row[2],
    coordinator: row[3],
    repName: row[4],
    repPhone: row[5],
    createdAt: row[6],
    lastReviewed: row[7],
  };
}

function updateClient(data) {
  const sheet = getOrCreateClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: "No clients found." };

  const ids = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getDisplayValues()
    .flat();
  const rowIndex = ids.indexOf(data.id);

  if (rowIndex === -1) {
    return { success: false, message: "Client not found." };
  }

  const rowNum = rowIndex + 2; // +2 because of header and 0-based index

  // Update columns 2-6 (Contact Date to Representative Phone)
  // Note: Created At (col 7) is not updated
  const rowData = [
    data.contactDate,
    data.assessmentDateTime,
    data.coordinator,
    data.repName,
    data.repPhone,
  ];

  sheet.getRange(rowNum, 2, 1, rowData.length).setValues([rowData]);

  // Update Last Reviewed
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const reviewIdx = headers.indexOf("Last Reviewed");
  if (reviewIdx > -1) {
    sheet.getRange(rowNum, reviewIdx + 1).setValue(new Date());
  }

  return { success: true, message: "Client updated successfully!" };
}
