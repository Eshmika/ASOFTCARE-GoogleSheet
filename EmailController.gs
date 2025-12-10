function sendRecruitmentEmail(data, caregiverId) {
  // 1. Setup Links
  const webAppUrl = ScriptApp.getService().getUrl();
  const applicationLink = `${webAppUrl}?page=apply&id=${caregiverId}`;

  // 2. Prepare Attachments
  var attachments = [];

  // These are the exact IDs extracted from your links
  const fileIds = [
    "1-akwIVsG1ltUON7vqZJBGLcDCc_E9Emq", // Application for Employment 2025.pdf
    "1hK-5vAcGZQD_av4eFDaMGv5rfgMVEc67", // Job Description
    "11NtPiwoABW1RU0roiuH5zhEhYRqIZ999", // Policy / Other
  ];

  fileIds.forEach((id) => {
    try {
      // Fetch file and convert to Blob
      const file = DriveApp.getFileById(id);
      console.log(`Successfully fetched file: ${file.getName()}`);
      attachments.push(file.getBlob());
    } catch (e) {
      // Log error but continue so email still sends
      console.error(
        `ERROR: Could not attach file ID ${id}. Check Share settings. Details: ${e.message}`
      );
    }
  });

  // 3. Email Content
  const subject = `Action Required: Application for Allevia Senior Care (${caregiverId})`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <!-- Header -->
      <div style="background-color: #65c027; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0; font-size: 24px;">Allevia Senior Care</h2>
        <p style="color: #f0fdf4; margin: 5px 0 0; font-style: italic;">Because Home is Where the Care Is</p>
      </div>
      
      <!-- Body -->
      <div style="padding: 30px; background-color: #ffffff;">
        <p style="margin-top: 0;">Hi <strong>${data.firstName}</strong>,</p>
        
        <p>Thank you for starting your journey with us. We have successfully created your caregiver profile.</p>
        
        <!-- Info Box -->
        <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #65c027; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #555;"><strong>Caregiver ID:</strong> ${caregiverId}</p>
          <p style="margin: 5px 0 0; font-size: 14px; color: #555;"><strong>Status:</strong> Pending Application</p>
        </div>

        <p><strong>Step 1:</strong> Please download and review the attached PDF documents.</p>
        
        <p><strong>Step 2:</strong> Complete your formal background and employment application:</p>
        
        <!-- Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${applicationLink}" style="background-color: #65c027; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(101, 192, 39, 0.2);">
              Complete Application
          </a>
        </div>
        
        <p style="font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 20px;">
          If the button doesn't work, copy this link:<br>
          <a href="${applicationLink}" style="color: #65c027;">${applicationLink}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #9ca3af;">
        &copy; 2025 Allevia Senior Care. All rights reserved.
      </div>
    </div>
  `;

  // 4. Send
  MailApp.sendEmail({
    to: data.email,
    subject: subject,
    htmlBody: htmlBody,
    attachments: attachments,
  });
}

function sendClientWelcomeEmail(data, clientId) {
  console.log(`Sending Client Email to ${data.email}`);

  var attachments = [];
  // Use same file IDs or new ones if you have specific client docs
  const fileIds = [
    "1k4IZdrjQSms38CUoNH6fEOBAAmUmgewf",
    "139dpgbPksf5bKPJFTA4XTSO3hJLtn3sS",
    "1hE8OY6pSg2G3pVBYtGLiiSB_z3eephuu",
    "1HpOWueHbO1u9_jaYN9eLjL3R3hooPbq-",
    "1ImB8W3OQ9AsZMJZL5cfe1fgB3zj2jO7Y",
    "1hlQRUN-Q7HqXHnpsFJsfSHjgJ-k4TudT",
    "1TWSTlXxwbzXnP66WdMXMedlWSC-h_W6D",
    "1CJqLRnil4-14uwVNUn4RM5OM2_p9rHSW",
    "144-f4h2tz57_X9159j2vQBhQnhorl7VB",
    "1A1lAQUknKwKEELsvqRSCRr4XDfr-E0wb",
    "1eImrE6-veG9YMydn8sJvmj307AeYOLhh",
    "1KgHNBUBxzA_uaT_ndf1GMf2KiJI-pimP",
    "1ksWSuifLPBESZrF8HbZRed2OjyuOES6A",
  ];

  fileIds.forEach((id) => {
    try {
      const file = DriveApp.getFileById(id);
      attachments.push(file.getBlob());
    } catch (e) {
      console.error(`Error attaching file ${id}: ${e.message}`);
    }
  });

  const subject = `Welcome to Allevia Senior Care - Registration Successful (${clientId})`;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #65c027; padding: 24px; text-align: center;">
        <h2 style="color: white; margin: 0;">Allevia Senior Care</h2>
        <p style="color: #f0fdf4; margin: 5px 0 0;">Client Registration</p>
      </div>
      
      <div style="padding: 30px;">
        <p>Dear <strong>${data.firstName} ${data.lastName}</strong>,</p>
        
        <p>Welcome to the Allevia family. Your client profile has been successfully created.</p>
        
        <div style="background-color: #f8fafc; padding: 15px; border-left: 4px solid #65c027; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Client ID:</strong> ${clientId}</p>
          <p style="margin: 5px 0 0; font-size: 14px;"><strong>Service Type:</strong> ${data.type}</p>
        </div>

        <p><strong>Next Steps:</strong> Please find the attached registration documents. Kindly review and sign them at your earliest convenience.</p>
      </div>
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
