function sendRecruitmentEmail(data, caregiverId) {
  
  // GET THE URL OF THIS WEB APP AUTOMATICALLY
  const webAppUrl = ScriptApp.getService().getUrl();
    
  // Example: https://script.google.com/.../exec?page=apply&id=CG-1005
  const applicationLink = `${webAppUrl}?page=apply&id=${caregiverId}`;
  
  const doc1 = Utilities.newBlob("Policy...", "application/pdf", "Policy.pdf");
  
  const subject = `Action Required: Complete Application (${caregiverId})`;
  
  const htmlBody = `
    <div style="font-family: Arial; color: #333;">
      <h2 style="color: #65c027;">Next Step: Complete Your Profile</h2>
      <p>Hi ${data.firstName},</p>
      <p>Please click the button below to complete your secure background and address form.</p>
      <br>
      <a href="${applicationLink}" style="background-color: #65c027; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Open Application Form
      </a>
      <br><br>
      <p>If the button doesn't work, copy this link:<br>${applicationLink}</p>
    </div>
  `;
  
  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody,
    attachments: [doc1]
  });
}

// function testEmailPermission() {
//   MailApp.getRemainingDailyQuota(); // This forces the email permission check
//   console.log("Permissions granted!");
// }