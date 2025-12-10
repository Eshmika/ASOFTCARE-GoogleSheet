const CLIENT_SHEET_NAME = "Clients_DB";

function getOrCreateClientSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CLIENT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CLIENT_SHEET_NAME);
    const headers = [
      "Client ID",
      "First Name",
      "Middle Name",
      "Last Name",
      "Status",
      "DOB",
      "Gender",
      "Email",
      "Phone",
      "Type",
      "Address",
      "City",
      "Zip",
      "Emerg Name",
      "Emerg Relation",
      "Emerg Email",
      "Emerg Phone",
      "Emerg Address",
      "Emerg City",
      "Emerg Zip",
      "Living Alone",
      "Languages",
      "Created At",
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setBackground("#65c027")
      .setFontColor("white")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function handleClientSubmission(data) {
  const sheet = getOrCreateClientSheet();
  const lastRow = sheet.getLastRow();
  let newId = "CL-1001";

  if (lastRow > 1) {
    const lastIdStr = sheet.getRange(lastRow, 1).getValue().toString();
    const parts = lastIdStr.split("-");
    if (parts.length > 1) {
      const lastNum = parseInt(parts[1]);
      if (!isNaN(lastNum)) newId = "CL-" + (lastNum + 1);
    }
  }

  // Format Array for Sheet
  const rowData = [
    newId,
    data.firstName,
    data.middleName,
    data.lastName,
    data.status,
    data.dob,
    data.gender,
    data.email,
    data.phone,
    data.type,
    data.address,
    data.city,
    data.zip,
    data.emName,
    data.emRel,
    data.emEmail,
    data.emPhone,
    data.emAddress,
    data.emCity,
    data.emZip,
    data.livingAlone,
    data.languages,
    new Date(),
  ];

  sheet.appendRow(rowData);

  // Send Welcome Email
  sendClientWelcomeEmail(data, newId);

  return { success: true, message: "Client added successfully!", id: newId };
}

function getClientList() {
  const sheet = getOrCreateClientSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  // Get all data as text
  const data = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getDisplayValues();

  return data
    .filter((row) => row[0] !== "")
    .map((row) => ({
      id: row[0],
      name: `${row[1]} ${row[3]}`, // First + Last
      email: row[7],
      phone: row[8],
      status: row[4],
      type: row[9],
      city: row[11],
    }))
    .reverse();
}
