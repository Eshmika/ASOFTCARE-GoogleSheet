/**
 * Sends the recruitment email with attachments and form link.
 */
function sendRecruitmentEmail(data, caregiverId) {  
  
  const googleFormLink = "https://docs.google.com/forms/"; 
  
  const doc1 = Utilities.newBlob("Policy Document Content...", "application/pdf", "Caregiver_Policy.pdf");
  const doc2 = Utilities.newBlob("Job Description Content...", "application/pdf", "Job_Description.pdf");
  const doc3 = Utilities.newBlob("Contract Terms Content...", "application/pdf", "Contract_Terms.pdf");
  
  const subject = `Next Steps: Caregiver Application (Ref: ${caregiverId})`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: #65c027;">Welcome to the Team, ${data.firstName}!</h2>
      <p>Thank you for registering as a <strong>${data.title}</strong>.</p>
      <p>Your Caregiver ID is: <strong>${caregiverId}</strong></p>
      <hr>
      <h3>Next Steps:</h3>
      <p>Please complete the full application form by clicking the link below:</p>
      <p>
        <a href="${googleFormLink}" style="background-color: #65c027; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Complete Application Form
        </a>
      </p>
      <p>We have attached 3 important documents for your review.</p>
      <br>
      <p>Regards,<br>Senior Care HR Team</p>
    </div>
  `;
  
  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody,
    attachments: [doc1, doc2, doc3]
  });
}

// function testEmailPermission() {
//   MailApp.getRemainingDailyQuota(); // This forces the email permission check
//   console.log("Permissions granted!");
// }