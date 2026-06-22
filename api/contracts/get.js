import { getSupabase } from '../lib/supabase.js';
import { json } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }
  const token = req.query?.token;
  if (!token) return json(res, 400, { error: 'Token required' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('employment_contracts')
      .select('*')
      .eq('signing_token', token)
      .single();

    if (error || !data) return json(res, 404, { error: 'Contract not found' });

    if (data.status === 'completed') {
      return json(res, 200, {
        status: 'completed',
        contractReference: data.contract_reference,
        employeeName: data.employee_name,
        completedAt: data.completed_at,
        message: 'This contract has already been signed.'
      });
    }

    if (new Date(data.expires_at) < new Date()) {
      await supabase.from('employment_contracts').update({ status: 'expired' }).eq('id', data.id);
      return json(res, 410, { error: 'This signing link has expired. Please contact HR for a new link.' });
    }

    return json(res, 200, {
      status: data.status,
      contractReference: data.contract_reference,
      employeeName: data.employee_name,
      employeeEmail: data.employee_email,
      role: data.role,
      scale: data.scale,
      templateData: data.template_data,
      directorSignature: data.director_signature,
      expiresAt: data.expires_at
    });
  } catch (err) {
    console.error('[contracts/get]', err);
    return json(res, 500, { error: err.message || 'Failed to load contract' });
  }
}
