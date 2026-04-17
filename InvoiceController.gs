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
