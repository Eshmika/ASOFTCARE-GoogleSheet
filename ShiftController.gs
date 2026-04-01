const SHIFT_SHEET_NAME = "Shifts_DB";
const SHIFT_HISTORY_SETTING_KEY = "SHIFT_HISTORY_PAY_PERIOD_MODE";

const SHIFT_HISTORY_COLUMNS = [
  "Shift ID",
  "Invoice ID",
  "Invoice Status",
  "Pay Period Type",
  "Pay Period Start",
  "Pay Period End",
  "Segment Number",
  "Original Start Time",
  "Original End Time",
  "Error Flag",
  "System Check",
  "Client Full Name / ID",
  "Caregiver Full Name / ID",
  "EVV",
  "Start Date",
  "End Date",
  "Clock In",
  "Clock Out",
  "Total Hours",
  "In Method",
  "Out Method",
  "Billable Hours",
  "Payable Hours",
  "Billing Type",
  "Service",
  "Type",
  "Authorization Code",
  "Client Rate",
  "CG Rate",
  "Softcare Rate",
  "Agency Rate",
  "Mileage KM",
  "Mileage Price",
  "Confirmation Indicator",
  "Invoice Total",
  "Schedule Note",
  "Admin Note",
  "CG Shift Status",
  "Client Shift Status",
  "System Shift Status",
  "Created By",
  "Created At",
  "Last Modified By",
  "Last Modified At",
];

function ensureShiftSheetHeaders(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const missingHeaders = SHIFT_HISTORY_COLUMNS.filter(
    (header) => !headers.includes(header)
  );

  if (missingHeaders.length > 0) {
    const startCol = sheet.getLastColumn() + 1;
    sheet
      .getRange(1, startCol, 1, missingHeaders.length)
      .setValues([missingHeaders]);
    sheet
      .getRange(1, startCol, 1, missingHeaders.length)
      .setFontWeight("bold")
      .setBackground("#f3f4f6");
  }
}

function getShiftHistoryPayPeriodSetting() {
  const properties = PropertiesService.getScriptProperties();
  const savedMode = properties.getProperty(SHIFT_HISTORY_SETTING_KEY);
  return savedMode === "Biweekly" ? "Biweekly" : "Weekly";
}

function saveShiftHistoryPayPeriodSetting(mode) {
  const normalized = String(mode || "").trim();
  if (!["Weekly", "Biweekly"].includes(normalized)) {
    throw new Error("Invalid pay period mode");
  }

  PropertiesService.getScriptProperties().setProperty(
    SHIFT_HISTORY_SETTING_KEY,
    normalized
  );

  return { payPeriodMode: normalized };
}

function getShiftHistorySettings() {
  return { payPeriodMode: getShiftHistoryPayPeriodSetting() };
}

function parseShiftDate(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return new Date(dateValue);

  const text = String(dateValue).trim();
  if (!text) return null;

  const parts = text.split("-");
  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function formatShiftDate(dateValue, timeZone) {
  if (!dateValue) return "";
  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, timeZone, "yyyy-MM-dd");
  }
  return String(dateValue);
}

function formatShiftTime(dateValue, timeZone) {
  if (!dateValue) return "";
  if (dateValue instanceof Date) {
    return Utilities.formatDate(dateValue, timeZone, "HH:mm");
  }
  return String(dateValue);
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateKey(dateValue) {
  if (!(dateValue instanceof Date)) return "";
  return `${dateValue.getFullYear()}-${pad2(dateValue.getMonth() + 1)}-${pad2(
    dateValue.getDate()
  )}`;
}

function startOfWeekSunday(dateValue) {
  const start = new Date(dateValue);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function getShiftHistoryPeriod(anchorDate, payPeriodMode) {
  const normalizedAnchor =
    anchorDate instanceof Date ? new Date(anchorDate) : new Date();
  normalizedAnchor.setHours(0, 0, 0, 0);

  const periodStart = startOfWeekSunday(normalizedAnchor);
  const periodLengthDays = payPeriodMode === "Biweekly" ? 14 : 7;
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodStart.getDate() + periodLengthDays - 1);
  periodEnd.setHours(23, 59, 59, 999);

  return {
    start: periodStart,
    end: periodEnd,
    label: `${Utilities.formatDate(
      periodStart,
      Session.getScriptTimeZone(),
      "MMM d, yyyy"
    )} - ${Utilities.formatDate(
      periodEnd,
      Session.getScriptTimeZone(),
      "MMM d, yyyy"
    )}`,
  };
}

function buildInvoiceId(periodStart, payPeriodMode) {
  const prefix = payPeriodMode === "Biweekly" ? "BI" : "WK";
  return `INV-${prefix}-${Utilities.formatDate(
    periodStart,
    Session.getScriptTimeZone(),
    "yyyyMMdd"
  )}`;
}

function buildSystemCheckLabel(shiftRow) {
  const issues = [];
  if (!shiftRow.clockIn) issues.push("Missing Clock-In");
  if (!shiftRow.clockOut) issues.push("Missing Clock-Out");
  if (
    shiftRow.clockIn &&
    shiftRow.clockOut &&
    shiftRow.clockIn === shiftRow.clockOut
  ) {
    issues.push("Invalid Time Range");
  }
  if (shiftRow.segmentNumber > 1) issues.push("Overnight Split");
  return issues.length > 0 ? issues.join(", ") : "OK";
}

function buildShiftHistoryRows(
  rawShifts,
  clientMap,
  caregiverMap,
  settings,
  filters
) {
  const timeZone = Session.getScriptTimeZone();
  const searchTerm = String(filters.search || "")
    .trim()
    .toLowerCase();
  const selectedClientId = String(filters.clientId || "all");
  const selectedCaregiverId = String(filters.caregiverId || "all");
  const selectedSystemCheck = String(filters.systemCheck || "all");

  const period = getShiftHistoryPeriod(
    filters.payPeriodDate
      ? new Date(`${filters.payPeriodDate}T00:00:00`)
      : new Date(),
    settings.payPeriodMode
  );

  const rows = [];

  rawShifts.forEach((shift) => {
    const originalStartDate = parseShiftDate(shift.date);
    const originalEndDate = parseShiftDate(shift.endDate || shift.date);
    if (!originalStartDate) return;

    const startParts = String(shift.clockIn || "00:00").split(":");
    const endParts = String(shift.clockOut || "00:00").split(":");
    const startTime = new Date(originalStartDate);
    startTime.setHours(
      Number(startParts[0]) || 0,
      Number(startParts[1]) || 0,
      0,
      0
    );
    let endTime = new Date(originalEndDate || originalStartDate);
    endTime.setHours(Number(endParts[0]) || 0, Number(endParts[1]) || 0, 0, 0);
    if (endTime <= startTime) {
      endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
    }

    const segments = [];
    let segmentStart = new Date(startTime);
    let segmentNumber = 1;

    while (segmentStart < endTime) {
      const boundary = new Date(segmentStart);
      boundary.setHours(24, 0, 0, 0);
      const segmentEnd = endTime < boundary ? new Date(endTime) : boundary;

      segments.push({
        segmentNumber,
        segmentStart: new Date(segmentStart),
        segmentEnd: new Date(segmentEnd),
      });

      segmentStart = new Date(segmentEnd);
      segmentNumber += 1;
    }

    segments.forEach((segment) => {
      const segmentDateKey = toDateKey(segment.segmentStart);
      const periodStartKey = toDateKey(period.start);
      const periodEndKey = toDateKey(period.end);

      if (
        segment.segmentStart < period.start ||
        segment.segmentStart > period.end
      ) {
        return;
      }

      const client = clientMap[shift.clientId] || { name: "Unknown Client" };
      const caregiver = caregiverMap[shift.caregiverId] || {
        name: "Unknown Caregiver",
      };
      const hours = Math.max(
        0,
        (segment.segmentEnd - segment.segmentStart) / (1000 * 60 * 60)
      );
      const invoiceTotal = (Number(shift.totalClientPrice) || 0).toFixed(2);
      const systemCheck = buildSystemCheckLabel({
        clockIn: shift.clockIn,
        clockOut: shift.clockOut,
        segmentNumber: segment.segmentNumber,
      });
      const errorFlag = systemCheck === "OK" ? "" : systemCheck;

      rows.push({
        id: shift.id,
        shiftId: shift.id,
        clientId: shift.clientId,
        caregiverId: shift.caregiverId,
        invoiceId: buildInvoiceId(period.start, settings.payPeriodMode),
        invoiceStatus: shift.invoiceStatus || "Unpaid",
        payPeriodType: settings.payPeriodMode,
        payPeriodStart: Utilities.formatDate(
          period.start,
          timeZone,
          "yyyy-MM-dd"
        ),
        payPeriodEnd: Utilities.formatDate(period.end, timeZone, "yyyy-MM-dd"),
        segmentNumber: segment.segmentNumber,
        originalStartTime: shift.clockIn || "",
        originalEndTime: shift.clockOut || "",
        errorFlag,
        systemCheck,
        clientName: `${client.name} / ${shift.clientId}`,
        caregiverName: `${caregiver.name} / ${shift.caregiverId}`,
        evv: shift.evv || "GPS",
        date: formatShiftDate(shift.date, timeZone),
        startDate: formatShiftDate(shift.date, timeZone),
        endDate: formatShiftDate(shift.endDate || shift.date, timeZone),
        clockIn: formatShiftTime(segment.segmentStart, timeZone),
        clockOut: formatShiftTime(segment.segmentEnd, timeZone),
        totalHours: hours.toFixed(2),
        inMethod: shift.inMethod || "GPS",
        outMethod: shift.outMethod || "GPS",
        billableHours: shift.billableHours || hours.toFixed(2),
        payableHours: shift.payableHours || hours.toFixed(2),
        billingType: shift.billingType || "Hourly",
        service: shift.serviceType || "",
        serviceType: shift.serviceType || "",
        type: shift.shiftType || "",
        shiftType: shift.shiftType || "",
        authorizationCode: shift.authorizationCode || "",
        clientRate: shift.clientRate || "",
        cgRate: shift.caregiverRate || "",
        softcareRate: shift.totalSoftcarePrice || "",
        agencyRate: shift.totalAgencyPrice || "",
        totalClientPrice: shift.totalClientPrice || "",
        totalCaregiverPrice: shift.totalCaregiverPrice || "",
        totalAgencyPrice: shift.totalAgencyPrice || "",
        totalSoftcarePrice: shift.totalSoftcarePrice || "",
        mileageKm: shift.mileageKm || "",
        mileagePrice: shift.mileagePrice || "",
        confirmationIndicator:
          shift.confirmationIndicator ||
          (segment.segmentNumber > 1 ? "Split" : "Confirmed"),
        invoiceTotal,
        scheduleNote: shift.notes || "",
        adminNote: shift.adminNote || "",
        cgShiftStatus: shift.cgShiftStatus || "Pending",
        clientShiftStatus: shift.clientShiftStatus || "Pending",
        systemShiftStatus: shift.systemShiftStatus || "Pending",
        createdBy: shift.createdBy || "System",
        createdAt: shift.createdAt || "",
        lastModifiedBy: shift.lastModifiedBy || "",
        lastModifiedAt: shift.lastModifiedAt || "",
        notes: shift.notes || "",
        segmentDateKey,
        periodStartKey,
        periodEndKey,
      });
    });
  });

  const filteredRows = rows.filter((row) => {
    const clientMatches =
      selectedClientId === "all" || row.clientId === selectedClientId;
    const caregiverMatches =
      selectedCaregiverId === "all" || row.caregiverId === selectedCaregiverId;
    const systemMatches =
      selectedSystemCheck === "all" ||
      String(row.systemCheck || "").includes(selectedSystemCheck) ||
      String(row.errorFlag || "").includes(selectedSystemCheck);

    const haystack = [
      row.shiftId,
      row.invoiceId,
      row.clientName,
      row.caregiverName,
      row.scheduleNote,
      row.adminNote,
      row.systemCheck,
      row.billingType,
      row.service,
      row.type,
    ]
      .join(" ")
      .toLowerCase();
    const searchMatches = !searchTerm || haystack.includes(searchTerm);

    return clientMatches && caregiverMatches && systemMatches && searchMatches;
  });

  return {
    period: {
      start: Utilities.formatDate(period.start, timeZone, "yyyy-MM-dd"),
      end: Utilities.formatDate(period.end, timeZone, "yyyy-MM-dd"),
      label: period.label,
      payPeriodMode: settings.payPeriodMode,
    },
    rows: filteredRows,
    summary: (() => {
      const seenShiftIds = new Set();
      return filteredRows.reduce(
        (acc, row) => {
          acc.totalHours += Number(row.totalHours) || 0;
          if (!seenShiftIds.has(row.shiftId)) {
            seenShiftIds.add(row.shiftId);
            acc.totalClient += Number(row.invoiceTotal) || 0;
            acc.totalCaregiver += Number(row.totalCaregiverPrice) || 0;
            acc.totalAgency += Number(row.totalAgencyPrice) || 0;
            acc.totalSoftcare += Number(row.totalSoftcarePrice) || 0;
            acc.totalMileage += Number(row.mileagePrice) || 0;
          }
          return acc;
        },
        {
          totalClient: 0,
          totalCaregiver: 0,
          totalAgency: 0,
          totalSoftcare: 0,
          totalMileage: 0,
          totalHours: 0,
        }
      );
    })(),
  };
}

function getShiftHistory(data) {
  const sheet = getOrCreateShiftSheet();
  ensureShiftSheetHeaders(sheet);

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return {
      period: getShiftHistoryPeriod(
        new Date(),
        getShiftHistoryPayPeriodSetting()
      ),
      rows: [],
      summary: {
        totalClient: 0,
        totalCaregiver: 0,
        totalAgency: 0,
        totalSoftcare: 0,
        totalMileage: 0,
        totalHours: 0,
      },
    };
  }

  const headers = values[0];
  const clientList = getClientList();
  const caregiverList = getCaregiverList();
  const clientMap = {};
  const caregiverMap = {};

  clientList.forEach((client) => {
    clientMap[client.id] = client;
  });
  caregiverList.forEach((caregiver) => {
    caregiverMap[caregiver.id] = caregiver;
  });

  const rawShifts = values.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index];
    });
    return {
      id: record["Shift ID"],
      clientId: record["Client ID"],
      caregiverId: record["Caregiver ID"],
      date: record["Start Date"],
      endDate: record["End Date"],
      clockIn: record["Clock In"],
      clockOut: record["Clock Out"],
      billingType: record["Billing Type"],
      serviceType: record["Service Type"],
      shiftType: record["Shift Type"],
      clientRate: record["Client Rate"],
      caregiverRate: record["Caregiver Rate"],
      totalAgencyPrice: record["Total Agency Price"],
      totalSoftcarePrice: record["Total Softcare Price"],
      totalClientPrice: record["Total Client Price"],
      totalCaregiverPrice: record["Total Caregiver Price"],
      notes: record["Notes"],
      invoiceStatus: record["Invoice Status"],
      authorizationCode: record["Authorization Code"],
      billableHours: record["Billable Hours"],
      payableHours: record["Payable Hours"],
      adminNote: record["Admin Note"],
      cgShiftStatus: record["CG Shift Status"],
      clientShiftStatus: record["Client Shift Status"],
      systemShiftStatus: record["System Shift Status"],
      confirmationIndicator: record["Confirmation Indicator"],
      mileageKm: record["Mileage KM"],
      mileagePrice: record["Mileage Price"],
      evv: record["EVV"],
      inMethod: record["In Method"],
      outMethod: record["Out Method"],
      createdBy: record["Created By"],
      createdAt: record["Created At"],
      lastModifiedBy: record["Last Modified By"],
      lastModifiedAt: record["Last Modified At"],
    };
  });

  return buildShiftHistoryRows(
    rawShifts,
    clientMap,
    caregiverMap,
    {
      payPeriodMode: getShiftHistoryPayPeriodSetting(),
    },
    data || {}
  );
}

function getOrCreateShiftSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHIFT_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHIFT_SHEET_NAME);
    const headers = [
      "Shift ID",
      "Client ID",
      "Caregiver ID",
      "Start Date",
      "End Date",
      "Clock In",
      "Clock Out",
      "Hours",
      "Billing Type",
      "Service Type",
      "Shift Type",
      "Client Rate",
      "Caregiver Rate",
      "Agency Share",
      "Softcare Share",
      "Total Client Price",
      "Total Caregiver Price",
      "Total Agency Price",
      "Total Softcare Price",
      "Notes",
      "Created At",
    ];
    sheet.appendRow(headers);
    sheet
      .getRange(1, 1, 1, headers.length)
      .setFontWeight("bold")
      .setBackground("#f3f4f6");
  }
  return sheet;
}

function getShifts(startDateStr, endDateStr) {
  const sheet = getOrCreateShiftSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Indices
  const dateIdx = headers.indexOf("Start Date");
  const endDateIdx = headers.indexOf("End Date");
  const clientIdx = headers.indexOf("Client ID");
  const cgIdx = headers.indexOf("Caregiver ID");
  const startIdx = headers.indexOf("Clock In");
  const endIdx = headers.indexOf("Clock Out");
  const hoursIdx = headers.indexOf("Hours");
  const billingTypeIdx = headers.indexOf("Billing Type");
  const serviceTypeIdx = headers.indexOf("Service Type");
  const shiftTypeIdx = headers.indexOf("Shift Type");
  const clientRateIdx = headers.indexOf("Client Rate");
  const caregiverRateIdx = headers.indexOf("Caregiver Rate");
  const totalClientPriceIdx = headers.indexOf("Total Client Price");
  const totalCaregiverPriceIdx = headers.indexOf("Total Caregiver Price");
  const notesIdx = headers.indexOf("Notes");

  if (dateIdx === -1) return [];
  if (data.length <= 1) return []; // No data rows

  const timeZone =
    SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(23, 59, 59, 999);

  // Filter
  const shifts = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowDateStr = row[dateIdx]; // Assuming string YYYY-MM-DD or Date object

    // Skip empty rows
    if (!rowDateStr || !row[clientIdx] || !row[cgIdx]) continue;

    let rowDate;
    if (rowDateStr instanceof Date) {
      rowDate = new Date(rowDateStr);
    } else {
      const parts = String(rowDateStr).split("-");
      if (parts.length !== 3) continue;
      rowDate = new Date(parts[0], parts[1] - 1, parts[2]);
    }
    rowDate.setHours(0, 0, 0, 0);

    // Simple range check (could be improved for multi-day overlaps)
    if (rowDate >= start && rowDate <= end) {
      const clockInVal = row[startIdx];
      const clockOutVal = row[endIdx];
      const endDateVal = row[endDateIdx];

      // Fix: Use original string if available to avoid timezone shifts
      let dateOutput = "";
      if (rowDateStr instanceof Date) {
        dateOutput = Utilities.formatDate(rowDateStr, timeZone, "yyyy-MM-dd");
      } else if (
        typeof rowDateStr === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(rowDateStr)
      ) {
        dateOutput = rowDateStr;
      } else {
        dateOutput = Utilities.formatDate(rowDate, timeZone, "yyyy-MM-dd");
      }

      let endDateOutput = "";
      if (endDateVal instanceof Date) {
        endDateOutput = Utilities.formatDate(
          endDateVal,
          timeZone,
          "yyyy-MM-dd"
        );
      } else if (
        typeof endDateVal === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(endDateVal)
      ) {
        endDateOutput = endDateVal;
      } else {
        endDateOutput = String(endDateVal || "");
      }

      shifts.push({
        id: row[0],
        clientId: row[clientIdx],
        caregiverId: row[cgIdx],
        date: dateOutput,
        endDate: endDateOutput,
        clockIn:
          clockInVal instanceof Date
            ? Utilities.formatDate(clockInVal, timeZone, "HH:mm")
            : String(clockInVal || ""),
        clockOut:
          clockOutVal instanceof Date
            ? Utilities.formatDate(clockOutVal, timeZone, "HH:mm")
            : String(clockOutVal || ""),
        hours: row[hoursIdx],
        billingType: row[billingTypeIdx],
        serviceType: row[serviceTypeIdx],
        shiftType: row[shiftTypeIdx],
        clientRate: row[clientRateIdx],
        caregiverRate: row[caregiverRateIdx],
        totalClientPrice: row[totalClientPriceIdx],
        totalCaregiverPrice: row[totalCaregiverPriceIdx],
        notes: row[notesIdx],
      });
    }
  }
  return shifts;
}

function saveShift(data) {
  const sheet = getOrCreateShiftSheet();
  const timestamp = new Date();

  // Determine dates to save
  let datesToSave = [];
  // Parse YYYY-MM-DD from input
  const parts = data.startDate.split("-");
  const startDate = new Date(parts[0], parts[1] - 1, parts[2]);

  if (data.repeat === "none") {
    datesToSave.push(new Date(startDate));
  } else if (data.repeat === "3days") {
    for (let i = 0; i < 3; i++) {
      let d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      datesToSave.push(d);
    }
  } else if (data.repeat === "5days") {
    for (let i = 0; i < 5; i++) {
      let d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      datesToSave.push(d);
    }
  } else if (data.repeat === "week") {
    for (let i = 0; i < 7; i++) {
      let d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      datesToSave.push(d);
    }
  }

  // Save each shift
  datesToSave.forEach((date) => {
    const shiftId = "SH-" + Utilities.getUuid().slice(0, 8).toUpperCase();
    const formattedDate = Utilities.formatDate(
      date,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

    // Calculate End Date for this specific shift instance
    const startParts = data.startDate.split("-");
    const originalStart = new Date(
      startParts[0],
      startParts[1] - 1,
      startParts[2]
    );

    const endParts = data.endDate.split("-");
    const originalEnd = new Date(endParts[0], endParts[1] - 1, endParts[2]);

    const durationDays = (originalEnd - originalStart) / (1000 * 60 * 60 * 24);

    let thisEndDate = new Date(date);
    thisEndDate.setDate(date.getDate() + durationDays);
    const formattedEndDate = Utilities.formatDate(
      thisEndDate,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );

    const row = [
      shiftId,
      data.clientId,
      data.caregiverId,
      formattedDate,
      formattedEndDate,
      data.clockIn,
      data.clockOut,
      data.hours,
      data.billingType,
      data.serviceType,
      data.shiftType,
      data.clientRate,
      data.caregiverRate,
      data.agencyShare,
      data.softcareShare,
      data.totalClientPrice,
      data.totalCaregiverPrice,
      data.totalAgencyPrice,
      data.totalSoftcarePrice,
      data.notes,
      timestamp,
    ];
    sheet.appendRow(row);

    const metaRowIndex = sheet.getLastRow();
    const headerMap = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const metaUpdates = {
      "Invoice Status": "Unpaid",
      "CG Shift Status": "Pending",
      "Client Shift Status": "Pending",
      "System Shift Status": "Pending",
      "Created By": "System",
      "Created At": timestamp,
      "Last Modified By": "System",
      "Last Modified At": timestamp,
    };

    Object.entries(metaUpdates).forEach(([header, value]) => {
      const colIdx = headerMap.indexOf(header);
      if (colIdx !== -1) {
        sheet.getRange(metaRowIndex, colIdx + 1).setValue(value);
      }
    });
  });

  return { success: true };
}

function updateShift(data) {
  const sheet = getOrCreateShiftSheet();
  const range = sheet.getDataRange();
  const values = range.getValues();
  const shiftId = data.shiftId; // Ensure ID is passed

  // Find row by ID (Column 1, index 0)
  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === shiftId) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error("Shift not found");
  }

  // Map headers to find column indices
  const headers = values[0];
  const updateMap = {
    "Client ID": data.clientId,
    "Caregiver ID": data.caregiverId,
    "Start Date": data.startDate,
    "End Date": data.endDate,
    "Clock In": data.clockIn,
    "Clock Out": data.clockOut,
    Hours: data.hours,
    "Billing Type": data.billingType,
    "Service Type": data.serviceType,
    "Shift Type": data.shiftType,
    "Client Rate": data.clientRate,
    "Caregiver Rate": data.caregiverRate,
    "Agency Share": data.agencyShare,
    "Softcare Share": data.softcareShare,
    "Total Client Price": data.totalClientPrice,
    "Total Caregiver Price": data.totalCaregiverPrice,
    "Total Agency Price": data.totalAgencyPrice,
    "Total Softcare Price": data.totalSoftcarePrice,
    Notes: data.notes,
  };

  // Update cells
  for (const [header, value] of Object.entries(updateMap)) {
    const colIdx = headers.indexOf(header);
    if (colIdx !== -1) {
      sheet.getRange(rowIndex, colIdx + 1).setValue(value);
    }
  }

  const modifiedMeta = {
    "Last Modified By": "System",
    "Last Modified At": new Date(),
  };

  Object.entries(modifiedMeta).forEach(([header, value]) => {
    const colIdx = headers.indexOf(header);
    if (colIdx !== -1) {
      sheet.getRange(rowIndex, colIdx + 1).setValue(value);
    }
  });

  return { success: true };
}

function deleteShift(shiftId) {
  const sheet = getOrCreateShiftSheet();
  const data = sheet.getDataRange().getValues();

  // Find row index
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === shiftId) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  throw new Error("Shift not found");
}
