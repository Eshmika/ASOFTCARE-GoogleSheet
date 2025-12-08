function sendRecruitmentEmail(data, caregiverId) {
  const webAppUrl = ScriptApp.getService().getUrl();
  const applicationLink = `${webAppUrl}?page=apply&id=${caregiverId}`;

  // --- ATTACHMENT LOGIC ---
  var attachments = [];

  // These are the File IDs you provided
  const fileIds = [
    "1-akwIVsG1ltUON7vqZJBGLcDCc_E9Emq", // Application / Policy
    "1hK-5vAcGZQD_av4eFDaMGv5rfgMVEc67", // Job Description
    "11NtPiwoABW1RU0roiuH5zhEhYRqIZ999", // Contract / Other
  ];

  fileIds.forEach((id) => {
    try {
      // getBlob() is better than getAs() for files that are already PDFs
      const file = DriveApp.getFileById(id);
      attachments.push(file.getBlob());
    } catch (e) {
      console.log(
        `Warning: Could not attach file ID ${id}. Error: ${e.message}`
      );
      // We continue loop so the email is still sent even if one file is missing
    }
  });

  const subject = `Action Required: Application for Allevia Senior Care (${caregiverId})`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
      <h2 style="color: #65c027;">Allevia Senior Care</h2>
      <p style="font-style: italic;">Because Home is Where the Care Is</p>
      <hr style="border: 1px solid #eee;">
      
      <p>Hi ${data.firstName},</p>
      
      <p>Thank you for your interest in joining our team. Please download the attached documents for your records.</p>
      
      <p><strong>Next Step:</strong> Please complete your formal Employment Application by clicking the button below.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${applicationLink}" style="background-color: #65c027; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Complete Employment Application
        </a>
      </div>
      
      <p>If the button above does not work, please copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #666;">${applicationLink}</p>
      
      <br>
      <p>Best regards,<br>Recruitment Team<br>Allevia Senior Care</p>
    </div>
  `;

  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody,
    attachments: attachments,
  });
}

// function testEmailPermission() {
//   MailApp.getRemainingDailyQuota(); // This forces the email permission check
//   console.log("Permissions granted!");
// }
