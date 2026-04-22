function getInvoiceSettings() {
  return { payPeriodMode: getShiftHistoryPayPeriodSetting() };
}

function getInvoiceHistory(filters) {
  const input = filters || {};

  return getShiftHistory({
    startDate: input.startDate || "",
    endDate: input.endDate || "",
    caregiverId: input.caregiverId || "all",
    clientId: input.clientId || "all",
    search: input.search || "",
    systemCheck: "all",
  });
}

function generateCaregiverInvoicePDF(startDate, endDate, caregiverId) {
  try {
    if (!caregiverId || caregiverId === "all")
      throw new Error("A specific Caregiver must be selected.");
    if (!startDate || !endDate)
      throw new Error("Start and End dates are required.");

    // Get caregiver details
    const cgList = getCaregiverList();
    const cg = cgList.find((c) => c.id === caregiverId);
    if (!cg) throw new Error("Caregiver not found.");

    let ssnMasked = "XXX-XX-XXXX";
    if (cg.ssn) {
      const ssnStr = String(cg.ssn).replace(/\D/g, "");
      if (ssnStr.length >= 4) {
        ssnMasked = "XXX-XX-" + ssnStr.slice(-4);
      }
    }

    // Get client list for initials
    const clList = getClientList();
    const getInitials = (clientId, name) => {
      const cl = clList.find((c) => c.id === clientId);
      let clName = cl ? cl.name : name || "";
      clName = clName.split("/")[0].trim(); // Remove "/ ID" part if present
      const parts = clName.split(" ").filter((p) => p.length > 0);
      if (parts.length === 0) return "";
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    // Get shifts
    const history = getShiftHistory({
      startDate: startDate,
      endDate: endDate,
      caregiverId: caregiverId,
      clientId: "all",
      systemCheck: "all",
    });

    const shiftRows = history.rows || [];
    const shiftsData = [];
    let totalEarnings = 0;

    shiftRows.forEach((row) => {
      const rate = parseFloat(row.caregiverRate) || 0;
      const amount = parseFloat(row.totalCaregiverPrice) || 0;
      totalEarnings += amount;

      shiftsData.push({
        invoiceId: row.invoiceId || "N/A",
        clientInitials: getInitials(row.clientId, row.clientName),
        service: row.serviceType || "N/A",
        startDate: row.startDate || "",
        endDate: row.endDate || "",
        clockIn: row.clockIn || "",
        clockOut: row.clockOut || "",
        hours: row.hours || "",
        rate: rate.toFixed(2),
        total: amount.toFixed(2),
      });
    });

    const templateData = {
      caregiverName: cg.name || "",
      caregiverId: cg.id || "",
      ssnMasked: ssnMasked,
      caregiverAddress: [cg.address, cg.street, cg.city, cg.state, cg.zip]
        .filter(Boolean)
        .join(" "),
      caregiverPhone: cg.phone || "",
      payPeriod: `${startDate} to ${endDate}`,
      printDate: new Date().toLocaleDateString(),
      shifts: shiftsData,
      totalEarnings: totalEarnings.toFixed(2),
    };

    const template = HtmlService.createTemplateFromFile(
      "view-caregiver-invoice-pdf"
    );
    template.data = templateData;
    const html = template.evaluate().getContent();

    const blob = Utilities.newBlob(html, MimeType.HTML).getAs(MimeType.PDF);
    blob.setName(
      `Earning_Statement_${cg.name.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_${startDate}.pdf`
    );

    return {
      success: true,
      filename: blob.getName(),
      base64: Utilities.base64Encode(blob.getBytes()),
    };
  } catch (e) {
    Logger.log(e);
    return { success: false, message: e.message };
  }
}
