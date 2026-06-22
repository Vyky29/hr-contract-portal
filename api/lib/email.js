import { Resend } from 'resend';

const FROM = process.env.RESEND_FROM_EMAIL || 'HR Contract Portal <contracts@clubsensational.co.uk>';
const HR_EMAIL = process.env.HR_EMAIL || 'hr@clubsensational.co.uk';

export async function sendInviteEmail({ employeeEmail, employeeName, signingUrl, contractReference, role, contractKind }) {
  const isZeroHours = contractKind !== 'fixed_term';
  const contractLabel = isZeroHours ? 'Zero Hours Employment Contract' : 'Fixed Term Employment Contract';
  const annexNote = isZeroHours
    ? '<p style="font-size:13px;color:#64748b;">The contract document includes <strong>Annex A</strong>: workplace pension (auto-enrolment) information required by UK law.</p>'
    : '';
  const subject = 'Action required: Sign your clubSENsational employment contract';
  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f2744;max-width:560px;">
      <p>Dear ${escapeHtml(employeeName)},</p>
      <p>clubSENsational has prepared your <strong>${contractLabel}</strong> for the role of <strong>${escapeHtml(role)}</strong>.</p>
      <p>Reference: <strong>${escapeHtml(contractReference)}</strong></p>
      ${annexNote}
      <p>Please review the contract and add your signature using the secure link below:</p>
      <p style="margin:24px 0;"><a href="${signingUrl}" style="background:#0f2744;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;font-weight:600;">Review and sign contract</a></p>
      <p style="font-size:13px;color:#64748b;">Or copy this link:<br><a href="${signingUrl}">${signingUrl}</a></p>
      <p style="font-size:13px;color:#64748b;">This link expires in 14 days. If you have questions, contact HR at clubSENsational.</p>
      <p>Kind regards,<br>clubSENsational HR Team</p>
    </div>`;
  return sendEmail(employeeEmail, subject, html);
}

export async function sendCompletionEmails({ employeeEmail, employeeName, contractReference, role, signingUrl }) {
  const employeeSubject = 'Your signed employment contract — clubSENsational';
  const employeeHtml = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f2744;max-width:560px;">
      <p>Dear ${escapeHtml(employeeName)},</p>
      <p>Thank you. Your employment contract (<strong>${escapeHtml(contractReference)}</strong>) has been signed successfully.</p>
      <p>Please keep the PDF you downloaded for your records.</p>
      <p>Role: ${escapeHtml(role)}</p>
      <p>Kind regards,<br>clubSENsational</p>
    </div>`;

  const hrSubject = `Contract signed: ${employeeName} — ${contractReference}`;
  const hrHtml = `
    <div style="font-family:Segoe UI,Arial,sans-serif;color:#0f2744;max-width:560px;">
      <p>Hello HR team,</p>
      <p><strong>${escapeHtml(employeeName)}</strong> has signed their employment contract.</p>
      <ul>
        <li>Reference: ${escapeHtml(contractReference)}</li>
        <li>Role: ${escapeHtml(role)}</li>
        <li>Employee email: ${escapeHtml(employeeEmail)}</li>
      </ul>
      <p>The employee downloaded the fully signed PDF from the portal. Store a copy in the employee file.</p>
      <p><a href="${signingUrl}">View contract record</a></p>
    </div>`;

  const results = await Promise.all([
    sendEmail(employeeEmail, employeeSubject, employeeHtml),
    sendEmail(HR_EMAIL, hrSubject, hrHtml)
  ]);
  return { employee: results[0], hr: results[1] };
}

async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipped email to', to, subject);
    return { skipped: true, to };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({ from: FROM, to: [to], subject, html });
  if (error) throw new Error(error.message || 'Email send failed');
  return { ok: true, id: data?.id, to };
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
