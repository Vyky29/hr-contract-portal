/* Employee signing page */
(function () {
  'use strict';
  const C = window.ContractCore;
  if (!C) return;

  const $ = (id) => document.getElementById(id);
  let contractData = null;
  let employeeSignatureDataUrl = '';
  let padApi = null;
  let padReady = false;

  function showState(id) {
    ['loadingState', 'errorState', 'completedState', 'signForm'].forEach((s) => {
      const el = $(s);
      if (el) el.classList.toggle('hidden', s !== id);
    });
  }

  function renderPreview(templateData, directorSignature) {
    const filled = C.fillTemplate(templateData);
    $('contractPreview').innerHTML = C.renderContractHtml(filled, false, {
      directorSignatureDataUrl: directorSignature,
      employeeSignatureDataUrl: employeeSignatureDataUrl
    });
  }

  function ensurePad() {
    if (padReady) {
      padApi.resize();
      return;
    }
    padApi = C.setupSignaturePad($('signatureCanvas'), { drawing: false }, (url) => {
      employeeSignatureDataUrl = url;
      if (contractData) {
        renderPreview(contractData.templateData, contractData.directorSignature);
      }
      updateSubmit();
    });
    padReady = true;
  }

  function updateSubmit() {
    const typed = $('typedName').value.trim();
    const name = contractData ? contractData.employeeName : '';
    const match = typed && name && typed.toLowerCase() === name.trim().toLowerCase();
    const ok = match && employeeSignatureDataUrl && $('acknowledgement').checked;
    $('submitSign').disabled = !ok;
    $('signWarning').style.display = ok ? 'none' : 'block';
  }

  async function loadContract() {
    const token = C.getSigningTokenFromUrl();
    if (!token) {
      $('errorMessage').textContent = 'Invalid signing link. Please contact HR.';
      showState('errorState');
      return;
    }

    try {
      const res = await fetch('/api/contracts/get?token=' + encodeURIComponent(token));
      const data = await res.json();
      if (!res.ok) {
        $('errorMessage').textContent = data.error || 'Contract not found.';
        showState('errorState');
        return;
      }
      if (data.status === 'completed') {
        $('completedRef').textContent = data.contractReference || '';
        showState('completedState');
        return;
      }

      contractData = data;
      $('pageEmployeeName').textContent = data.employeeName;
      $('pageReference').textContent = data.contractReference;
      $('typedName').placeholder = 'Type: ' + data.employeeName;
      renderPreview(data.templateData, data.directorSignature);
      showState('signForm');
      ensurePad();
    } catch (err) {
      $('errorMessage').textContent = 'Could not load contract. Please try again later.';
      showState('errorState');
      console.error(err);
    }
  }

  async function submitSignature() {
    if (!$('submitSign') || $('submitSign').disabled) return;
    const token = C.getSigningTokenFromUrl();
    $('submitSign').disabled = true;
    $('submitSign').textContent = 'Submitting…';

    try {
      const res = await fetch('/api/contracts/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          employeeSignature: employeeSignatureDataUrl,
          employeeTypedName: $('typedName').value.trim(),
          acknowledged: true,
          origin: C.getOrigin()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      contractData.templateData = data.templateData;
      await downloadPdf(data);

      $('completedRef').textContent = data.contractReference;
      showState('completedState');
    } catch (err) {
      alert(err.message || 'Could not submit signature.');
      $('submitSign').disabled = false;
      $('submitSign').textContent = 'Sign and download PDF';
    }
  }

  async function downloadPdf(data) {
    const templateData = { ...data.templateData, _contractDateRaw: data.templateData._contractDateRaw };
    const html = C.buildPdfHtml(templateData, {
      directorSignatureDataUrl: data.directorSignature,
      employeeSignatureDataUrl: data.employeeSignature,
      logoDataUrl: C.logoDataUrl
    });
    const pdfEl = $('pdfSource');
    pdfEl.innerHTML = html;
    pdfEl.classList.remove('hidden');
    pdfEl.style.cssText = 'position:fixed;left:0;top:0;width:210mm;z-index:9999;background:#fff;';
    try {
      await html2pdf().set({
        margin: 12,
        filename: C.pdfFilename(templateData),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(pdfEl).save();
    } finally {
      pdfEl.classList.add('hidden');
      pdfEl.style.cssText = '';
    }
  }

  function bindEvents() {
    $('typedName').addEventListener('input', updateSubmit);
    $('acknowledgement').addEventListener('change', updateSubmit);
    $('clearSignature').addEventListener('click', () => {
      if (padApi) padApi.clear();
      employeeSignatureDataUrl = '';
      if (contractData) renderPreview(contractData.templateData, contractData.directorSignature);
      updateSubmit();
    });
    $('submitSign').addEventListener('click', submitSignature);
    window.addEventListener('resize', () => {
      if (padReady && padApi) padApi.resize();
    });
  }

  function init() {
    bindEvents();
    showState('loadingState');
    C.loadLogo().then((url) => {
      if (url) C.logoDataUrl = url;
      loadContract();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
