function setupMondayMailsTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => {
    if (trigger.getHandlerFunction() === "runMondayShiftApprovals") {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger("runMondayShiftApprovals")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  return "Trigger created successfully for every Monday at 8 AM.";
}

function runMondayShiftApprovals() {
  const sheet = getOrCreateShiftSheet();
  const period = getCurrentBiweeklyPeriod(new Date());

  // Get active caregiver and client IDs
  const activeCaregivers = getCaregiverList()
    .filter((c) => String(c.status).toLowerCase() === "active")
    .map((c) => c.id);

  const activeClients = getClientList()
    .filter((c) => String(c.status).toLowerCase() === "active")
    .map((c) => c.id);

  const timeZone = Session.getScriptTimeZone();
  const start = Utilities.formatDate(period.start, timeZone, "yyyy-MM-dd");
  const end = Utilities.formatDate(period.end, timeZone, "yyyy-MM-dd");

  // Send Caregiver Shift Approvals
  if (activeCaregivers.length > 0) {
    sendCaregiverShiftApprovals(activeCaregivers, null, start, end);
  }

  // Send Client Shift Approvals
  if (activeClients.length > 0) {
    sendClientShiftApprovals(activeClients, null, start, end);
  }
}
