/**
 * Publish employment contract to staff Portal dashboard (portal_staff_announcements).
 * Uses same Supabase project as PORTALVIC (cklpnwhlqsulpmkipmqb).
 */
export async function resolvePortalUserId(supabase, employeeEmail) {
  const email = String(employeeEmail || "").trim().toLowerCase();
  if (!email) return null;
  const { data, error } = await supabase.rpc("portal_user_id_for_email", { p_email: email });
  if (error) {
    console.warn("[portal_publish] portal_user_id_for_email", error.message);
    return null;
  }
  return data || null;
}

export async function publishContractToStaffDashboard(supabase, opts) {
  const {
    contractId,
    userId,
    contractReference,
    role,
    employeeName,
    createdByUserId
  } = opts;

  if (!contractId || !userId) {
    return { skipped: true, reason: "missing contractId or userId" };
  }

  const body = JSON.stringify({
    contract_id: contractId,
    reference: contractReference || "",
    employee_name: employeeName || ""
  });

  const row = {
    title: `Sign employment contract${role ? " � " + role : ""}`,
    body,
    message_type: "contract_signing",
    priority: "high",
    audience_scope: "all_staff",
    delivery_scope: "single_user",
    target_user_id: userId,
    target_staff_role: null
  };

  let creator = createdByUserId || null;
  if (!creator) {
    const { data: admins } = await supabase
      .from('staff_profiles')
      .select('id')
      .in('app_role', ['admin', 'ceo'])
      .limit(1);
    creator = admins?.[0]?.id || null;
  }
  if (!creator) creator = userId;
  row.created_by = creator;

  const { data, error } = await supabase
    .from("portal_staff_announcements")
    .insert([row])
    .select("id")
    .single();

  if (error) throw new Error(error.message || "Failed to publish to staff dashboard");

  await supabase
    .from("employment_contracts")
    .update({ announcement_id: data.id, sent_at: new Date().toISOString() })
    .eq("id", contractId);

  return { ok: true, announcementId: data.id };
}
