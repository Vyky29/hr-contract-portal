import { getSupabase } from '../lib/supabase.js';
import { json } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method not allowed' });
  }
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('employment_contracts')
      .select('contract_reference, employee_name, employee_email, role, scale, status, created_at, sent_at, completed_at, signing_token')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return json(res, 200, { contracts: data || [] });
  } catch (err) {
    console.error('[contracts/list]', err);
    return json(res, 500, { error: err.message || 'Failed to list contracts' });
  }
}
