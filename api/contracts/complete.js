import { getSupabase } from '../lib/supabase.js';
import { sendCompletionEmails } from '../lib/email.js';
import { json, readJson } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }
  try {
    const body = await readJson(req);
    const { token, employeeSignature, employeeTypedName, acknowledged, origin } = body;

    if (!token || !employeeSignature || !employeeTypedName || !acknowledged) {
      return json(res, 400, { error: 'Missing required signature data.' });
    }

    const supabase = getSupabase();
    const { data: row, error: fetchErr } = await supabase
      .from('employment_contracts')
      .select('*')
      .eq('signing_token', token)
      .single();

    if (fetchErr || !row) return json(res, 404, { error: 'Contract not found' });
    if (row.status === 'completed') return json(res, 400, { error: 'Contract already completed' });
    if (new Date(row.expires_at) < new Date()) {
      return json(res, 410, { error: 'Signing link expired' });
    }

    if (employeeTypedName.trim().toLowerCase() !== row.employee_name.trim().toLowerCase()) {
      return json(res, 400, { error: 'Typed name must match employee full name on the contract.' });
    }

    const now = new Date().toISOString();
    const templateData = { ...row.template_data };
    templateData.EMPLOYEE_SIGNATURE = '[Signed electronically]';
    templateData.EMPLOYEE_ACKNOWLEDGEMENT = 'Confirmed';
    templateData.SIGNED_TIMESTAMP = now;
    templateData.EMPLOYEE_SIGNATURE_DATE = templateData.EMPLOYEE_SIGNATURE_DATE || now;

    const { error: updateErr } = await supabase.from('employment_contracts').update({
      status: 'completed',
      employee_signature: employeeSignature,
      employee_typed_name: employeeTypedName.trim(),
      employee_acknowledged: true,
      template_data: templateData,
      completed_at: now,
      employee_signed_at: now,
      completion_email_sent: true
    }).eq('id', row.id);

    if (updateErr) throw new Error(updateErr.message);

    const siteOrigin = (origin || process.env.SITE_URL || '').replace(/\/$/, '');
    const signingUrl = `${siteOrigin}/sign/${token}`;

    let emailResult = {};
    try {
      emailResult = await sendCompletionEmails({
        employeeEmail: row.employee_email,
        employeeName: row.employee_name,
        contractReference: row.contract_reference,
        role: row.role,
        signingUrl
      });
    } catch (mailErr) {
      emailResult = { error: mailErr.message };
    }

    return json(res, 200, {
      ok: true,
      contractReference: row.contract_reference,
      templateData,
      directorSignature: row.director_signature,
      employeeSignature,
      email: emailResult
    });
  } catch (err) {
    console.error('[contracts/complete]', err);
    return json(res, 500, { error: err.message || 'Failed to complete contract' });
  }
}
