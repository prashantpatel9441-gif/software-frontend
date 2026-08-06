import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../components/Toast';
import { api } from '../services/api';
import {
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  RotateCw,
  CheckCircle2,
  Truck,
  Loader2,
  X,
  FileText,
  User,
  Calendar,
  CreditCard,
  MapPin,
  Phone,
  Hash,
  Save,
  Edit2,
  PackageX,
  ChevronRight
} from 'lucide-react';

const paymentColors = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Partial: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
  Overdue: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  Draft: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

export const SalesOrder = ({ onCreateInvoice, onViewDrafts }) => {
  const { showToast, ToastContainer } = useToast();
  const [activeTab, setActiveTab] = useState('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [companySettings, setCompanySettings] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    client: '',
    product: '',
    payment: '',
    delivery: ''
  });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanySettings();
  }, [activeTab]);

  const fetchCompanySettings = async () => {
    try {
      const data = await api.get('/settings');
      if (data) setCompanySettings(data);
    } catch (e) {
      console.error('Failed to fetch settings');
    }
  };

  const numberToWords = (num) => {
    const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
    const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
  };

  // Fetch invoices from backend
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await api.get('/invoices');
      if (Array.isArray(data)) {
        setInvoices(data.map(inv => {
          const grandTotal = inv.grandTotal || 0;
          const paid = inv.amountReceived || 0;
          const pending = Math.max(0, grandTotal - paid);
          
          let computedPayment = inv.payment || 'Pending';
          if (computedPayment !== 'Draft') {
            if (pending < 0.01 && grandTotal > 0) computedPayment = 'Paid';
            else if (paid > 0 && pending >= 0.01 && computedPayment !== 'Overdue') computedPayment = 'Partial';
            else if (paid === 0 && computedPayment !== 'Overdue') computedPayment = 'Pending';
          }

          return {
            ...inv,
            id: inv.invoiceId, // JSX expects id
            issueDate: inv.issueDate ? new Date(inv.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            dueDate: inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            total: grandTotal,
            paid: paid,
            pending: pending || null,
            payment: computedPayment,
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filteredInvoices = invoices.filter(inv => {
    // Search by text
    const searchLower = (searchTerm || '').toLowerCase().trim();
    const matchesSearch = !searchLower ||
      (inv.client && String(inv.client).toLowerCase().includes(searchLower)) ||
      (inv.id && String(inv.id).toLowerCase().includes(searchLower));

    // Advanced filters
    const filterClient = (filters.client || '').toLowerCase().trim();
    const matchesClient = !filterClient || (inv.client && String(inv.client).toLowerCase().includes(filterClient));

    const filterProd = (filters.product || '').toLowerCase().trim();
    const matchesProduct = !filterProd || (inv.items && inv.items.some(item =>
      (item.product || item.description || '').toLowerCase().includes(filterProd)
    ));

    const matchesPayment = !filters.payment || String(inv.payment).toLowerCase() === String(filters.payment).toLowerCase();

    const matchesDelivery = !filters.delivery || String(inv.delivery).toLowerCase() === String(filters.delivery).toLowerCase();

    const matchesAllFilters = matchesClient && matchesProduct && matchesPayment && matchesDelivery;

    if (activeTab === 'invoices') {
      return matchesSearch && matchesAllFilters && inv.payment !== 'Draft';
    }
    if (activeTab === 'drafts') {
      return matchesSearch && matchesAllFilters && inv.payment === 'Draft';
    }
    if (activeTab === 'quotations' || activeTab === 'returns') {
      return false; // Remain empty for mock screens
    }
    return matchesSearch && matchesAllFilters;
  });

  const fmt = (n) => n ? '₹' + n.toLocaleString('en-IN') : '—';

  const deliverySteps = ['Processing', 'Dispatched', 'Delivered', 'Cancelled'];

  const deliveryColors = {
    Delivered: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    Dispatched: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    Processing: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    Cancelled: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200',
  };

  const deliveryIcon = (status) => {
    if (status === 'Delivered') return <CheckCircle2 className="w-3 h-3" />;
    if (status === 'Dispatched') return <Truck className="w-3 h-3" />;
    if (status === 'Processing') return <Loader2 className="w-3 h-3 animate-spin" />;
    if (status === 'Cancelled') return <PackageX className="w-3 h-3" />;
    return null;
  };

  // Cycle delivery status and save to backend immediately
  const handleCycleDelivery = async (inv) => {
    const currentIdx = deliverySteps.indexOf(inv.delivery);
    const nextStatus = deliverySteps[(currentIdx + 1) % deliverySteps.length];
    try {
      await api.put(`/invoices/${inv.id}`, { delivery: nextStatus });
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, delivery: nextStatus } : i));
    } catch (err) {
      console.error('Error updating delivery:', err);
    }
  };

  // Open edit modal pre-filled with invoice data
  const openEdit = (inv) => {
    setEditingInvoice(inv);
    setEditForm({
      delivery: inv.delivery || 'Processing',
      payment: inv.payment || 'Pending',
      paymentMethod: inv.paymentMethod || 'Cash',
      amountReceived: inv.amountReceived || 0,
      notes: inv.notes || '',
      dueDate: inv.dueDate && inv.dueDate !== '—' ? inv.dueDate : '',
    });
  };

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return;
    setSaving(true);
    try {
      const amountReceived = parseFloat(editForm.amountReceived) || 0;
      const grandTotal = editingInvoice.total || 0;
      const pendingAmt = Math.max(0, grandTotal - amountReceived);
      
      let computedPayment = editForm.payment;
      if (computedPayment !== 'Draft') {
        if (pendingAmt < 0.01 && grandTotal > 0) computedPayment = 'Paid';
        else if (amountReceived > 0 && pendingAmt >= 0.01 && computedPayment !== 'Overdue') computedPayment = 'Partial';
        else if (amountReceived === 0 && computedPayment !== 'Overdue') computedPayment = 'Pending';
      }

      const payload = {
        delivery: editForm.delivery,
        payment: computedPayment,
        paymentMethod: editForm.paymentMethod,
        amountReceived: amountReceived,
        notes: editForm.notes,
      };
      await api.put(`/invoices/${editingInvoice.id}`, payload);
      // Update local state
      setInvoices(prev => prev.map(i => i.id === editingInvoice.id
        ? {
          ...i,
          delivery: payload.delivery,
          payment: payload.payment,
          paymentMethod: payload.paymentMethod,
          amountReceived: payload.amountReceived,
          paid: payload.amountReceived,
          pending: Math.max(0, i.total - payload.amountReceived) || null,
          notes: payload.notes,
        }
        : i
      ));
      setEditingInvoice(null);
    } catch (err) {
      console.error('Error updating invoice:', err);
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return showToast('No records to export', 'error');

    const headers = ['Invoice ID', 'Client', 'Phone', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Pending', 'Payment Status', 'Delivery Status'];
    const rows = filteredInvoices.map(inv => [
      inv.id,
      `"${inv.client || ''}"`,
      inv.phone || '',
      inv.issueDate || '',
      inv.dueDate || '',
      inv.total || 0,
      inv.paid || 0,
      inv.pending || 0,
      inv.payment || '',
      inv.delivery || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_orders_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Export successful!', 'success');
  };

  const buildInvoiceHTML = (detail, autoPrint = true) => {
    const itemsList = detail.items || [];
    
    // Default fallback values if companySettings is not yet loaded or fields are empty
    const cs = companySettings || {};
    const compName = cs.companyName || 'GreenAdmin';
    const compAddress = cs.address || '';
    const compState = cs.state || '';
    const compPhone = cs.telephone || '';
    const gstNumber = cs.gstNumber || '';
    const logo = cs.logo || '';
    const terms = cs.termsAndConditions || '*(1) Payment should be made as per terms of payment.\n(2) Goods once sold will not be taken back.';
    const notes = cs.notes || 'Thank You For Your Business.';

    // Format dates
    const fIssue = detail.issueDate ? (typeof detail.issueDate === 'string' ? detail.issueDate : new Date(detail.issueDate).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})) : '';
    
    // Detect if any item is Feet unit
    const hasFeetUnit = itemsList.some(item => item.unit === 'Feet');

    // Build Item Rows
    let itemRows = '';
    itemsList.forEach((item, index) => {
      const pName = item.product || item.description || '';

      // dimStr: ONLY show Size (e.g. 22" × 78") if height & width exist. NEVER print Total Sq.Ft under product name.
      let dimStr = '';
      if (item.height > 0 && item.width > 0) {
        dimStr = `<div style="font-size: 10px; color: #444; margin-top: 1px; font-weight: bold;">Size: ${item.height}" × ${item.width}"</div>`;
      }

      // Calculate Feet value: if totalSqft > 0 or unit === 'Feet' or height/width exist
      const calculatedSqft = item.totalSqft || (item.height > 0 && item.width > 0 ? (item.qty * (item.height * item.width) / 144) : 0);
      const hasFeet = item.unit === 'Feet' || calculatedSqft > 0;
      
      const feetCell = hasFeet
        ? (calculatedSqft > 0 ? parseFloat(calculatedSqft.toFixed(2)).toString() : `${item.qty}`)
        : '';

      // Qty value: If pure Feet item with no dimensions, Qty column is empty; otherwise shows item.qty
      const isPureFeet = item.unit === 'Feet' && item.height === 0 && item.width === 0;
      const qtyCell = isPureFeet ? '' : `${item.qty || 1}`;

      itemRows += `
        <tr>
          <td style="border-right: 1px solid #000; padding:4px 8px; text-align:center;">${index + 1}</td>
          <td style="border-right: 1px solid #000; padding:4px 8px;">
            <div style="font-weight: bold;">${pName}${item.variant ? ` (${item.variant})` : ''}</div>
            ${dimStr}
          </td>
          <td style="border-right: 1px solid #000; padding:4px 8px; text-align:center;">${qtyCell}</td>
          <td style="border-right: 1px solid #000; padding:4px 8px; text-align:center;">${feetCell}</td>
          <td style="border-right: 1px solid #000; padding:4px 8px; text-align:right;">Rs. ${(item.pricePerSqft > 0 ? item.pricePerSqft : (item.price || 0)).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
          <td style="padding:4px 8px; text-align:right;">Rs. ${(item.total || (item.qty * (item.price || 0))).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
        </tr>
      `;
    });



    const amountInWords = numberToWords(Math.round(detail.grandTotal || 0));

    // Convert newlines to <br> for terms
    const formattedTerms = terms.split('\n').map(t => `<div>${t}</div>`).join('');
    const formattedNotes = notes.split('\n').map(t => `<div>${t}</div>`).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${detail.documentNumber || detail.id || 'Invoice'}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    @page { size: A4; margin: 0; }
    body { 
      font-family: 'Times New Roman', Times, serif; 
      font-size: 12px; 
      color: #000; 
      width: 210mm;
      min-height: 297mm;
      padding: 15mm; 
      margin: 0 auto;
      background: white;
      display: flex;
      flex-direction: column;
    }
    .top-header { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .company-logo { max-height: 120px; max-width: 280px; object-fit: contain; margin-bottom: 12px; }
    .company-name { font-size: 18px; font-weight: bold; }
    .company-addr { font-size: 12px; margin-top: 2px; }
    .state-tel { text-align: right; font-weight: bold; font-size: 12px; }
    
    .invoice-title-container { display: flex; align-items: center; margin: 15px 0 10px 0; }
    .line { flex-grow: 1; height: 2px; background-color: #000; }
    .invoice-title { margin: 0 10px; font-size: 16px; font-style: italic; font-weight: bold; }
    
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .meta-table > tbody > tr > td { padding: 0; vertical-align: top; border: none; }
    
    .to-box { border: 1px solid #000; padding: 5px; height: 100%; min-height: 85px; }
    .inv-details-table { width: 100%; border-collapse: collapse; height: 100%; }
    .inv-details-table td { border: 1px solid #000; padding: 4px 6px; font-size: 12px; }
    .inv-details-table td:first-child { font-weight: bold; width: 40%; }
    
    .main-table { width: 100%; border-collapse: collapse; border: 1px solid #000; flex-grow: 1; }
    .main-table th { border: 1px solid #000; padding: 5px; font-size: 12px; font-weight: bold; text-align: center; height: 30px; }
    .main-table td { font-size: 12px; }
    
    .summary-label { text-align: right; padding: 4px 8px; border: 1px solid #000; border-left: none; }
    .summary-val { text-align: right; padding: 4px 8px; border: 1px solid #000; border-right: none; width: 120px; font-weight: bold; }
    
    .words-row { padding: 5px 8px; text-align: right; font-weight: bold; border-top: 1px solid #000; border-bottom: 1px solid #000; }
    
    .eoe { text-align: right; font-size: 11px; margin-top: 2px; font-weight: bold; padding-right: 5px; }
    
    .footer-table { width: 100%; margin-top: 15px; border-top: 2px solid #000; padding-top: 5px; }
    .footer-table td { vertical-align: top; }
    
    .sign-box { text-align: right; margin-top: 40px; font-size: 12px; font-weight: bold; }
    .bottom-thanks { text-align: center; font-weight: bold; font-size: 12px; margin-top: 20px; }
    
    @media print{
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 15mm; }
      html, body { width: 210mm; height: 297mm; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="top-header">
    <div>
      ${logo ? `<img src="${logo}" class="company-logo" />` : ''}
      <div class="company-name">${compName}</div>
      <div class="company-addr">${compAddress.replace(/\\n/g, '<br/>')}</div>
    </div>
    <div class="state-tel">
      <div>State : ${compState}</div>
      <div>Tel : ${compPhone}</div>
      ${gstNumber ? `<div style="margin-top: 4px;">GSTIN : ${gstNumber}</div>` : ''}
    </div>
  </div>

  <!-- Title Divider -->
  <div class="invoice-title-container">
    <div class="line"></div>
    <div class="invoice-title">${detail.invoiceType || 'Invoice'}</div>
    <div class="line"></div>
  </div>

  <!-- Meta Info -->
  <table class="meta-table">
    <tr>
      <td style="width: 50%; padding-right: 10px;">
        <div class="to-box">
          <div>To :</div>
          <div style="font-weight: bold; font-size: 14px; margin-top: 2px;">${detail.client || ''}</div>
          <div style="margin-top: 2px;">${(detail.address || '').replace(/\\n/g, '<br/>')}</div>
        </div>
      </td>
      <td style="width: 50%;">
        <table class="inv-details-table">
          <tr><td>Invoice No.</td><td>${detail.documentNumber || detail.id}</td></tr>
          <tr><td>Invoice Date</td><td>${fIssue}</td></tr>
          <tr><td>Reference</td><td></td></tr>
          <tr><td>Payment Terms</td><td>${detail.payment || ''}</td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Main Items Table -->
  <table class="main-table">
    <thead>
      <tr>
        <th style="width: 6%;">Sr<br/>No.</th>
        <th style="width: 40%;">Item Name / Description</th>
        <th style="width: 9%;">Quantity</th>
        <th style="width: 9%;">Feet</th>
        <th style="width: 15%;">Unit Price</th>
        <th style="width: 21%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr style="height: 100%;">
        <td style="border-right: 1px solid #000;"></td>
        <td style="border-right: 1px solid #000;"></td>
        <td style="border-right: 1px solid #000;"></td>
        <td style="border-right: 1px solid #000;"></td>
        <td style="border-right: 1px solid #000;"></td>
        <td></td>
      </tr>
      
      <!-- Totals Section -->
      <tr>
        <td colspan="4" style="border-top: 1px solid #000; border-right: 1px solid #000;"></td>
        <td class="summary-label" style="border-top: 1px solid #000;">Sub Total :</td>
        <td class="summary-val" style="border-top: 1px solid #000;">Rs. ${(detail.subtotal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
      </tr>
      <tr>
        <td colspan="4" style="border-right: 1px solid #000;"></td>
        <td class="summary-label">Other Charge :</td>
        <td class="summary-val">Rs. ${(detail.otherCharge || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
      </tr>
      <tr>
        <td colspan="4" style="border-right: 1px solid #000;"></td>
        <td class="summary-label">Round Off :</td>
        <td class="summary-val">Rs. ${(detail.roundOff || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
      </tr>
      <tr>
        <td colspan="4" style="border-right: 1px solid #000;"></td>
        <td class="summary-label" style="font-weight: bold;">Total :</td>
        <td class="summary-val">Rs. ${(detail.grandTotal || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}</td>
      </tr>
      <tr>
        <td colspan="6" class="words-row">
          ${amountInWords} Only /-
        </td>
      </tr>
    </tbody>
  </table>


  <div class="eoe">E. & O. E.</div>

  <!-- Footer -->
  <table class="footer-table">
    <tr>
      <td style="width: 50%; padding-right: 10px;">
        <div style="font-weight: bold; font-size: 11px; margin-bottom: 3px;">Terms & Condition :</div>
        <div style="font-size: 11px;">${formattedTerms}</div>
        
        <div style="margin-top: 15px;">
          <div style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">Notes :</div>
          <div style="font-size: 11px;">${formattedNotes}</div>
        </div>
      </td>
      <td style="width: 50%; padding-left: 10px; vertical-align: bottom; text-align: right;">
        <div class="sign-box" style="display: inline-block; text-align: center;">
          <div style="margin-bottom: 40px; font-weight: normal;">For ${compName}</div>
          <div>Authorised Signatory</div>
        </div>
      </td>
    </tr>
  </table>

  <div class="invoice-title-container" style="margin-top: 15px; margin-bottom: 0;">
    <div class="line" style="height: 2px;"></div>
    <div class="bottom-thanks">Thank You For Your Business.</div>
    <div class="line" style="height: 2px;"></div>
  </div>

  ${autoPrint ? `<script>
    setTimeout(function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    }, 300);
  </script>` : ''}
</body>
</html>`;
  };




  const handlePrintPDF = (inv) => {
    const detail = inv.items ? inv : invoices.find(i => i.id === inv.id);
    if (!detail) return;
    const html = buildInvoiceHTML(detail);
    const win = window.open('', '_blank', 'width=820,height=950');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // Download button: now triggers the Print Dialog so user can Save as PDF
  const handleDownloadFile = (inv) => {
    handlePrintPDF(inv);
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
      <ToastContainer />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Order Records</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Manage invoices, billing & delivery status</p>
        </div>
        <div className="flex items-center gap-2.5">
          {onViewDrafts && (
            <button
              onClick={onViewDrafts}
              className="flex items-center gap-2 px-4 py-2.5 border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Saved Drafts
            </button>
          )}
          <button
            onClick={onCreateInvoice}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by invoice ID or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-all cursor-pointer ${showFilters || Object.values(filters).some(v => v) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters {Object.values(filters).filter(v => v).length > 0 && `(${Object.values(filters).filter(v => v).length})`}
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-4 gap-4 animate-in slide-in-from-top-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Name</label>
              <input
                type="text"
                placeholder="Filter by client..."
                value={filters.client}
                onChange={e => setFilters(f => ({ ...f, client: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Name</label>
              <input
                type="text"
                placeholder="Filter by product..."
                value={filters.product}
                onChange={e => setFilters(f => ({ ...f, product: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Status</label>
              <select
                value={filters.payment}
                onChange={e => setFilters(f => ({ ...f, payment: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery Status</label>
              <select
                value={filters.delivery}
                onChange={e => setFilters(f => ({ ...f, delivery: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="Processing">Processing</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            {(filters.client || filters.product || filters.payment || filters.delivery) && (
              <div className="col-span-4 flex justify-end mt-1">
                <button
                  onClick={() => setFilters({ client: '', product: '', payment: '', delivery: '' })}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100/60 p-1 rounded-xl w-fit">
        {[
          { id: 'invoices', label: 'Invoices' },
          { id: 'drafts', label: 'Drafts' },
          { id: 'quotations', label: 'Quotations' },
          { id: 'returns', label: 'Returns' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeTab === tab.id
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Invoice ID</th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Client</th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Issued</th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Due</th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Total</th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Paid</th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Pending</th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Payment</th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Delivery</th>
                <th className="py-3.5 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-5 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">{inv.id}</span>
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    <span className="font-bold text-slate-800 text-xs">{inv.client}</span>
                  </td>
                  <td className="py-4 px-5 text-slate-500 font-medium whitespace-nowrap">{inv.issueDate}</td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    <span className={`font-semibold text-xs ${inv.payment === 'Overdue' ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                      {inv.dueDate}
                    </span>
                  </td>
                  <td className="py-4 px-5 font-extrabold text-slate-900 whitespace-nowrap">{fmt(inv.total)}</td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    <span className={`font-bold ${inv.paid ? 'text-emerald-600' : 'text-slate-300'}`}>{fmt(inv.paid)}</span>
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    <span className={`font-bold ${inv.pending ? 'text-rose-500' : 'text-slate-300'}`}>{fmt(inv.pending)}</span>
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${paymentColors[inv.payment]}`}>
                      {inv.payment}
                    </span>
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    <button
                      onClick={() => handleCycleDelivery(inv)}
                      title="Click to advance delivery status"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all hover:opacity-80 hover:scale-105 ${deliveryColors[inv.delivery] || 'bg-slate-100 text-slate-600'}`}
                    >
                      {deliveryIcon(inv.delivery)}
                      {inv.delivery}
                      <ChevronRight className="w-2.5 h-2.5 opacity-50" />
                    </button>
                  </td>
                  <td className="py-4 px-5 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handlePrintPDF(inv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                        title="Print Bill"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDownloadFile(inv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                        title="Save as PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEdit(inv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                        title="Edit Invoice"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Bill Popup Modal (Rendered via portal to prevent stacking context bugs) ===== */}
      {selectedInvoice && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col" style={{ maxHeight: 'min(90vh,780px)', overflow: 'hidden' }}>

            {/* ---- Modal Header ---- */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800">Invoice Bill</p>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wide">{selectedInvoice.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ---- Modal Body ---- */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-5">

              {/* Company + Status Row */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-2xl font-black text-emerald-600 tracking-tight leading-none">GreenAdmin</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">admin@green.com &nbsp;·&nbsp; +91 11 2345 6789</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] font-bold ${paymentColors[selectedInvoice.payment]}`}>
                    {selectedInvoice.payment}
                  </span>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[11px] text-slate-400 font-medium">Issued: <span className="text-slate-600 font-semibold">{selectedInvoice.issueDate}</span></p>
                    {selectedInvoice.dueDate && (
                      <p className="text-[11px] text-rose-400 font-semibold">Due: {selectedInvoice.dueDate}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Client Card */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-50/50 rounded-2xl border border-slate-100 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Bill To</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                      {selectedInvoice.client.charAt(0)}
                    </div>
                    <p className="text-sm font-extrabold text-slate-800">{selectedInvoice.client}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                    <span>{selectedInvoice.phone}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
                    <span>{selectedInvoice.address}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <table className="w-full text-xs min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-3 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                      <th className="py-3 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider w-12">Qty</th>
                      <th className="py-3 px-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rate</th>
                      <th className="py-3 px-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items && selectedInvoice.items.map((item, i) => (
                      <tr key={i} className={`${i < selectedInvoice.items.length - 1 ? 'border-b border-slate-50' : ''} hover:bg-slate-50/50 transition-colors`}>
                        <td className="py-3.5 px-4 text-slate-700 font-semibold leading-snug">
                          <div>{item.description || item.product}{item.variant ? ` (${item.variant})` : ''}</div>
                          {item.height > 0 && item.width > 0 && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Size: {item.height}" × {item.width}"</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500">
                          {item.totalSqft > 0 ? `${item.totalSqft} Ft` : item.qty}
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-500">₹{(item.pricePerSqft > 0 ? item.pricePerSqft : (item.price || 0)).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-slate-800">₹{(item.total || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-700">₹{(selectedInvoice.subtotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                  {(selectedInvoice.discount || 0) > 0 && (
                    <div className="flex justify-between text-xs text-emerald-600">
                      <span>Discount / Advance</span>
                      <span className="font-semibold">− ₹{selectedInvoice.discount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {(selectedInvoice.tax || 0) > 0 && (
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>GST</span>
                      <span className="font-semibold text-slate-700">₹{selectedInvoice.tax.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="pt-3 mt-1 border-t-2 border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700">Grand Total</span>
                    <span className="text-xl font-black text-emerald-600">₹{(selectedInvoice.grandTotal || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ---- Modal Footer ---- */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium italic">Thank you for your business!</p>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handlePrintPDF(selectedInvoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ===== Edit Invoice Modal ===== */}
      {editingInvoice && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-800">Edit Invoice</p>
                  <p className="text-[10px] text-slate-400 font-semibold">{editingInvoice.id} · {editingInvoice.client}</p>
                </div>
              </div>
              <button onClick={() => setEditingInvoice(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto" style={{ maxHeight: '65vh' }}>

              {/* Delivery Status */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Delivery Status</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Processing', 'Dispatched', 'Delivered', 'Cancelled'].map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, delivery: status }))}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${editForm.delivery === status
                          ? deliveryColors[status] + ' shadow-sm'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
                        }`}
                    >
                      {deliveryIcon(status)}
                      {status}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">Select the current delivery stage for this order.</p>
              </div>

              {/* Payment Status */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Status</label>
                <select
                  value={editForm.payment}
                  onChange={e => setEditForm(f => ({ ...f, payment: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
                <select
                  value={editForm.paymentMethod}
                  onChange={e => setEditForm(f => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              {/* Amount Received */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Received (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.amountReceived}
                  onChange={e => setEditForm(f => ({ ...f, amountReceived: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-400 text-right"
                />
                <div className="flex justify-between text-[10px] font-semibold">
                  <span className="text-slate-400">Grand Total: <span className="text-slate-600">{fmt(editingInvoice.total)}</span></span>
                  <span className="text-rose-500">Pending: {fmt(Math.max(0, (editingInvoice.total || 0) - parseFloat(editForm.amountReceived || 0)))}</span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Notes / Remarks</label>
                <textarea
                  rows="2"
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Add internal notes..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-t border-slate-100">
              <button onClick={() => setEditingInvoice(null)} className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleUpdateInvoice}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SalesOrder;


