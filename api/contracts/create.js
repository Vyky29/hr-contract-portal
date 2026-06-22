import crypto from 'crypto';
import { getSupabase } from '../lib/supabase.js';
import { sendInviteEmail } from '../lib/email.js';
import { publishContractToStaffDashboard, resolvePortalUserId } from '../lib/portal_publish.js';
import { json, readJson } from '../lib/http.js';

const TABLE = 'employment_contracts';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }
  try {
    const body = await readJson(req);
    const {
      contractReference,
      templateData,
      formPayload,
      directorSignature,
      employeeEmail,
      employeeName,
      sendEmail: shouldSend = false,
      publishToPortal: shouldPublishPortal = true,
      origin,
      createdByUserId
    } = body;

    if (!contractReference || !templateData || !directorSignature || !employeeEmail || !employeeName) {
      return json(res, 400, { error: 'Missing required fields.' });
    }

    const supabase = getSupabase();
    const userId = await resolvePortalUserId(supabase, employeeEmail);
    if (!userId) {
      return json(res, 400, {
        error:
          'No Portal account found for this email. The employee must exist in Supabase Auth (same email as staff login) before sending a contract.'
      });
    }

    const signingToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const portalOrigin = (process.env.PORTAL_SITE_URL || 'https://portalvic.vercel.app').replace(/\/$/, '');
    const hrOrigin = (origin || process.env.SITE_URL || '').replace(/\/$/, '');
    const signingUrl = `${portalOrigin}/contract_sign.html?contract_id=PLACEHOLDER`;

    const row = {
      signing_token: signingToken,
      contract_reference: contractReference,
      contract_version: templateData.CONTRACT_VERSION || '1.0',
      status: 'awaiting_employee',
      user_id: userId,
      employee_name: employeeName,
      employee_email: employeeEmail.toLowerCase().trim(),
      employee_address: templateData.EMPLOYEE_ADDRESS || '',
      contract_date: formPayload?.contractDate || null,
      commencement_date: formPayload?.commencementDate || null,
      role: templateData.JOB_TITLE || '',
      scale: templateData.ROLE_SCALE || '',
      delivery_rate: templateData.DELIVERY_RATE || '',
      director_name: templateData.DIRECTOR_NAME || '',
      form_payload: formPayload || {},
      template_data: templateData,
      director_signature: directorSignature,
      expires_at: expiresAt,
      created_by_user_id: createdByUserId || null
    };

    const { data, error } = await supabase.from(TABLE).insert(row).select('id').single();
    if (error) throw new Error(error.message);

    const contractSignUrl = `${portalOrigin}/contract_sign.html?contract_id=${data.id}`;

    let portalResult = { skipped: true };
    if (shouldPublishPortal) {
      try {
        portalResult = await publishContractToStaffDashboard(supabase, {
          contractId: data.id,
          userId,
          contractReference,
          role: row.role,
          employeeName,
          createdByUserId
        });
      } catch (portalErr) {
        portalResult = { error: portalErr.message };
      }
    }

    let emailResult = { skipped: true };
    if (shouldSend) {
      try {
        emailResult = await sendInviteEmail({
          employeeEmail: row.employee_email,
          employeeName,
          signingUrl: contractSignUrl,
          contractReference,
          role: row.role,
          contractKind: templateData.CONTRACT_KIND || formPayload?.contractKind || 'zero_hours'
        });
      } catch (mailErr) {
        emailResult = { error: mailErr.message };
      }
    }

    return json(res, 200, {
      ok: true,
      id: data.id,
      userId,
      signingToken,
      signingUrl: contractSignUrl,
      portalSignUrl: contractSignUrl,
      contractReference,
      expiresAt,
      portal: portalResult,
      email: emailResult
    });
  } catch (err) {
    console.error('[contracts/create]', err);
    return json(res, 500, { error: err.message || 'Failed to create contract' });
  }
}
