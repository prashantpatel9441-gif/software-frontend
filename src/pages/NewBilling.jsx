import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { useCRM } from '../context/CRMContext';
import * as crmService from '../services/crmService';
import { 
  ArrowLeft, FileDown, Save, ChevronDown, Search, Trash2, Plus, Check,
  User, X, AlertCircle, Clock, TrendingDown, TrendingUp
} from 'lucide-react';

const ProductSearch = ({ item, productList, onSelect, onChange }) => {
  const [search, setSearch] = useState(item.product || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search]);

  useEffect(() => {
    if (highlightedIndex >= 0) {
      const el = document.getElementById(`product-item-${item.id}-${highlightedIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, item.id]);

  useEffect(() => {
    if (item.product !== search) {
      setSearch(item.product || '');
    }
  }, [item.product]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = productList.filter(p => ((p?.name || '').toLowerCase().includes(search.toLowerCase())) || (p?.sku && p.sku.toLowerCase().includes(search.toLowerCase())));

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      e.stopPropagation();
      const selectedProduct = filtered[highlightedIndex];
      if (selectedProduct) {
        onSelect(selectedProduct.name);
        setSearch(selectedProduct.name);
        setIsOpen(false);
      }
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search Product..."
          className="w-full pl-8 pr-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 cursor-text font-bold text-slate-700 text-xs"
        />
        {search && (
          <button onClick={() => { setSearch(''); onChange(''); onSelect(''); setIsOpen(true); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {isOpen && search && filtered.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.map((p, index) => (
            <div
              key={p._id || p.id || index}
              id={`product-item-${item.id}-${index}`}
              onClick={() => {
                onSelect(p.name);
                setSearch(p.name);
                setIsOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer border-b border-slate-50 last:border-0 ${highlightedIndex === index ? 'bg-emerald-100' : 'hover:bg-emerald-50'}`}
            >
              <div className="text-xs font-bold text-slate-800">{p.name}</div>
              {p.sku && <div className="text-[10px] text-slate-400">SKU: {p.sku}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const NewBilling = ({ onBack, draftData, prefillCustomer }) => {
  const { showToast, ToastContainer } = useToast();
  const { customers, syncFromInvoice, getCustomerPricing } = useCRM();
  const isEditingDraft = !!draftData;

  // ── Customer fields ───────────────────────────────────────
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerHighlightedIndex, setCustomerHighlightedIndex] = useState(-1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState([
    { id: Date.now(), product: '', variant: '', unit: 'Pcs', qty: 1, height: 0, width: 0, sqftPerPcs: 0, totalSqft: 0, pricePerSqft: 0, price: 0, disc: 0, tax: 0 }
  ]);


  const [amountReceived, setAmountReceived] = useState(0);
  const [otherCharge, setOtherCharge] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [detectedPendingBalance, setDetectedPendingBalance] = useState(0);
  const [includePreviousBalance, setIncludePreviousBalance] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('Pending (Credit)');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [summary, setSummary] = useState({ subtotal: 0, discount: 0, tax: 0, otherCharge: 0, roundOff: 0, grandTotal: 0, previousBalance: 0, netPayable: 0, pendingBalance: 0 });
  const [invoiceId, setInvoiceId] = useState('');
  const [productList, setProductList] = useState([]);
  const [priceHints, setPriceHints] = useState({});
  const [invoiceType, setInvoiceType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [allInvoices, setAllInvoices] = useState([]);
  const [issueDate, setIssueDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // ── Pre-fill from customer passed in (from Customers page) ─
  useEffect(() => {
    if (prefillCustomer) {
      fillCustomerFields(prefillCustomer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fillCustomerFields = (c) => {
    setSelectedCustomer(c);
    setCustomerName(c.name || '');
    setCustomerPhone(c.mobile || '');
    setCustomerCompany(c.company || '');
    setCustomerEmail(c.email || '');
    setCustomerGST(c.gst || '');
    setCustomerCity(c.city || '');
    setCustomerState(c.state || '');
    setBillingAddress(c.address || '');
    setCustomerSearchQuery(c.name || '');
    setShowCustomerDropdown(false);
  };

  // ── Customer live search ───────────────────────────────────
  useEffect(() => {
    setCustomerHighlightedIndex(-1);
    const q = customerSearchQuery.trim();
    if (!q) { setCustomerSearchResults([]); return; }
    const results = crmService.searchCustomers(customers, q).slice(0, 6);
    setCustomerSearchResults(results);
  }, [customerSearchQuery, customers]);

  useEffect(() => {
    if (customerHighlightedIndex >= 0) {
      const el = document.getElementById(`customer-item-${customerHighlightedIndex}`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [customerHighlightedIndex]);

  const handleCustomerKeyDown = (e) => {
    if (!showCustomerDropdown) return;

    const actualMaxIndex = customerSearchResults.length > 0 ? customerSearchResults.length : 0; 
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustomerHighlightedIndex(prev => Math.min(prev + 1, actualMaxIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustomerHighlightedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && customerHighlightedIndex >= 0) {
      e.preventDefault();
      e.stopPropagation();
      
      if (customerSearchResults.length > 0) {
        if (customerHighlightedIndex < customerSearchResults.length) {
          fillCustomerFields(customerSearchResults[customerHighlightedIndex]);
        } else {
          setShowCustomerDropdown(false);
          setCustomerName(customerSearchQuery);
        }
      } else {
        setShowCustomerDropdown(false);
        setCustomerName(customerSearchQuery);
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Pre-fill draft data ────────────────────────────────────
  useEffect(() => {
    if (draftData) {
      setCustomerName(draftData.client || '');
      setCustomerPhone(draftData.phone || '');
      setBillingAddress(draftData.address || '');
      setNotes(draftData.notes || '');
      setPaymentMethod(draftData.paymentMethod || 'Cash');
      setPaymentStatus(draftData.paymentStatus || 'Pending (Credit)');
      setAmountReceived(draftData.amountReceived || 0);
      setOtherCharge(draftData.otherCharge || 0);
      setRoundOff(draftData.roundOff || 0);
      if (draftData.previousBalance !== undefined) {
        const pb = parseFloat(draftData.previousBalance) || 0;
        if (pb > 0) {
          setDetectedPendingBalance(pb);
          setIncludePreviousBalance(true);
        } else {
          setIncludePreviousBalance(false);
        }
      }
      setInvoiceId(draftData.id || draftData.invoiceId || '');
      setInvoiceType(draftData.invoiceType || '');
      setDocumentNumber(draftData.documentNumber || '');
      if (draftData.issueDate) {
        setIssueDate(new Date(draftData.issueDate).toISOString().split('T')[0]);
      }
      if (draftData.items?.length > 0) {
        setItems(draftData.items.map((item, idx) => ({
          id: Date.now() + idx,
          product: item.product || '',
          variant: item.variant || '',
          qty: item.qty || 1,
          price: item.price || 0,
          disc: item.disc || 0,
          tax: item.tax || 0,
        })));
      }
      // Try to find matching customer
      if (draftData.phone) {
        const c = customers.find(cust => cust.mobile === draftData.phone);
        if (c) { setSelectedCustomer(c); setCustomerSearchQuery(c.name); }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch products ─────────────────────────────────────────
  useEffect(() => {
    api.get('/products', { params: { limit: 1000 } })
      .then(data => {
        if (data && data.products) setProductList(data.products);
        else if (Array.isArray(data)) setProductList(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/invoices').then(invs => {
      if (Array.isArray(invs)) {
        setAllInvoices(invs);
        if (!isEditingDraft) {
          let maxId = 0;
          invs.forEach(inv => {
            const match = inv.invoiceId?.match(/INV-\d{4}-(\d+)/) || inv.id?.match(/INV-\d{4}-(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxId) maxId = num;
            }
          });
          const year = new Date().getFullYear();
          setInvoiceId(`INV-${year}-${String(maxId + 1).padStart(3, '0')}`);
        }
      }
    }).catch(() => {
      if (!isEditingDraft) setInvoiceId(`INV-2026-${String(Math.floor(Math.random() * 900) + 100)}`);
    });
  }, [isEditingDraft]);

  // ── Auto-increment Document Number based on Customer ───────
  useEffect(() => {
    if (!customerName || allInvoices.length === 0) return;
    if (isEditingDraft && documentNumber) return; // Skip if editing draft and already has a doc num

    const lastInv = allInvoices.find(inv => inv.client === customerName && inv.documentNumber);
    if (lastInv && lastInv.documentNumber) {
      const lastDoc = lastInv.documentNumber.trim();
      const match = lastDoc.match(/^(.*?)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const numberStr = match[2];
        const padding = numberStr.length;
        const num = parseInt(numberStr, 10);
        const nextNum = (num + 1).toString().padStart(padding, '0');
        setDocumentNumber(`${prefix}${nextNum}`);
      } else {
        setDocumentNumber(lastDoc + ' 1');
      }
    } else {
      setDocumentNumber('1');
    }
  }, [customerName, allInvoices, isEditingDraft]);

  // ── Auto-calculate client previous pending balance ──────────
  useEffect(() => {
    if (isEditingDraft && draftData?.previousBalance !== undefined) return;
    const phone = customerPhone ? customerPhone.trim().replace(/\D/g, '') : '';
    const name = customerName ? customerName.trim().toLowerCase() : '';
    if (!phone && !name) {
      setDetectedPendingBalance(0);
      setIncludePreviousBalance(true);
      return;
    }

    const prevInvoices = allInvoices.filter(inv => {
      if (inv.paymentStatus === 'Draft' || inv.payment === 'Draft') return false;
      const invId = inv.invoiceId || inv.id;
      const currId = invoiceId || draftData?.invoiceId || draftData?.id;
      if (invId && currId && invId === currId) return false;

      const invPhone = inv.phone ? String(inv.phone).trim().replace(/\D/g, '') : '';
      const invName = inv.client ? String(inv.client).trim().toLowerCase() : '';

      const matchesPhone = phone && invPhone && invPhone === phone;
      const matchesName = name && invName && invName === name;
      return matchesPhone || matchesName;
    });

    const sumPending = prevInvoices.reduce((acc, inv) => {
      const gTotal = parseFloat(inv.grandTotal) || 0;
      const paid = parseFloat(inv.amountReceived) || 0;
      return acc + Math.max(0, gTotal - paid);
    }, 0);

    const detected = parseFloat(sumPending.toFixed(2));
    setDetectedPendingBalance(detected);
    setIncludePreviousBalance(true);
  }, [customerPhone, customerName, allInvoices, invoiceId, isEditingDraft, draftData]);

  // ── Calculate totals ───────────────────────────────────────
  useEffect(() => {
    let subtotal = 0, discount = 0, tax = 0;
    items.forEach(item => {
      const sqft = parseFloat(item.totalSqft) || 0;
      const pricePerSqft = parseFloat(item.pricePerSqft) || 0;
      const disc = parseFloat(item.disc) || 0, taxPct = parseFloat(item.tax) || 0;
      // If product has sqft, use sqft-based pricing; else fall back to qty*price
      const linePrice = sqft > 0 && pricePerSqft > 0 ? sqft * pricePerSqft : (parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0);
      const d = linePrice * (disc / 100);
      const t = (linePrice - d) * (taxPct / 100);
      subtotal += linePrice; discount += d; tax += t;
    });
    const oc = parseFloat(otherCharge) || 0;
    const ro = parseFloat(roundOff) || 0;
    const currentBillTotal = parseFloat((subtotal - discount + tax + oc + ro).toFixed(2));
    const effectivePreviousBalance = includePreviousBalance ? (parseFloat(detectedPendingBalance) || 0) : 0;
    const netPayable = parseFloat((currentBillTotal + effectivePreviousBalance).toFixed(2));
    const pendingBalance = parseFloat(Math.max(0, netPayable - (parseFloat(amountReceived) || 0)).toFixed(2));
    setSummary({ 
      subtotal: parseFloat(subtotal.toFixed(2)), 
      discount: parseFloat(discount.toFixed(2)), 
      tax: parseFloat(tax.toFixed(2)), 
      otherCharge: oc, 
      roundOff: ro, 
      grandTotal: currentBillTotal, 
      previousBalance: effectivePreviousBalance,
      netPayable,
      pendingBalance 
    });
  }, [items, amountReceived, otherCharge, roundOff, detectedPendingBalance, includePreviousBalance]);

  const handleRemovePreviousBalance = () => {
    setIncludePreviousBalance(false);
    if (paymentStatus === 'Paid') {
      setAmountReceived(summary.grandTotal);
    }
  };

  const handleAddBackPreviousBalance = () => {
    setIncludePreviousBalance(true);
    if (paymentStatus === 'Paid') {
      setAmountReceived(parseFloat((summary.grandTotal + detectedPendingBalance).toFixed(2)));
    }
  };

  // ── Update price hints when customer or product changes ────
  const updatePriceHint = async (itemId, productName) => {
    if (!selectedCustomer || !productName) {
      setPriceHints(h => { const n = { ...h }; delete n[itemId]; return n; });
      return;
    }
    try {
      const pricing = await getCustomerPricing(selectedCustomer._id || selectedCustomer.id, productName);
      if (pricing) {
        setPriceHints(h => ({ ...h, [itemId]: {
          lastPrice: pricing.lastPrice,
          avgPrice: pricing.averagePrice,
          lastDate: pricing.lastPurchaseDate,
          lastInvoiceId: pricing.lastInvoiceId,
        }}));
      } else {
        setPriceHints(h => { const n = { ...h }; delete n[itemId]; return n; });
      }
    } catch (e) {
      setPriceHints(h => { const n = { ...h }; delete n[itemId]; return n; });
    }
  };

  // ── Item handlers ──────────────────────────────────────────
  // ── Item handlers ──────────────────────────────────────────
  const handleAddItemRow = () => setItems([...items, { id: Date.now(), product: '', variant: '', unit: 'Pcs', qty: 1, height: 0, width: 0, sqftPerPcs: 0, totalSqft: 0, pricePerSqft: 0, price: 0, disc: 0, tax: 0 }]);
  const handleRemoveItemRow = (id) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const preventInvalidNumberInput = (e) => { if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault(); };

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      let update = { [field]: value };

      if (field === 'variant') {
        const found = productList.find(p => p.name === item.product);
        if (found) {
          let h = 0, w = 0, price = item.price;
          if (value !== '' && found.variantDetails?.length > 0) {
            const vd = found.variantDetails.find(v => v.variantName === value);
            if (vd) {
              if (vd.retailPrice) price = vd.retailPrice;
              if (vd.height > 0 && vd.width > 0) { h = vd.height; w = vd.width; }
            }
          }
          if (h === 0 || w === 0) { h = found.height || 0; w = found.width || 0; }
          update.price = price;
          update.height = h;
          update.width = w;
        }
      }

      const nextItem = { ...item, ...update };
      const h = parseFloat(nextItem.height) || 0;
      const w = parseFloat(nextItem.width) || 0;
      let q = parseFloat(nextItem.qty) || 0;
      const unit = nextItem.unit || 'Pcs';

      const sqftPerPcs = (h > 0 && w > 0) ? (h * w) / 144 : 0;

      let totalSqft = field === 'totalSqft' ? (parseFloat(value) || 0) : q * sqftPerPcs;

      // If unit is 'Feet' and product has no specific HxW dimensions, totalSqft matches qty (Feet)
      if (unit === 'Feet' && sqftPerPcs === 0) {
        if (field === 'qty') {
          totalSqft = q;
        } else if (field === 'totalSqft') {
          q = totalSqft;
          update.qty = q;
        }
      }

      let pricePerSqft = field === 'pricePerSqft' ? (parseFloat(value) || 0) : (parseFloat(nextItem.pricePerSqft) || 0);
      if (unit === 'Feet' && pricePerSqft === 0 && nextItem.price > 0) {
        pricePerSqft = parseFloat(nextItem.price) || 0;
      }

      const computedPrice = totalSqft > 0 && pricePerSqft > 0 ? parseFloat((totalSqft * pricePerSqft).toFixed(2)) : (pricePerSqft > 0 ? pricePerSqft : (parseFloat(nextItem.price) || 0));

      return {
        ...nextItem,
        qty: q,
        sqftPerPcs: parseFloat(sqftPerPcs.toFixed(2)),
        totalSqft: parseFloat(totalSqft.toFixed(2)),
        pricePerSqft,
        price: computedPrice,
      };
    }));
  };



  const handleProductSelect = async (id, productName) => {
    const found = productList.find(p => p.name === productName);

    let price = 0;
    if (selectedCustomer && productName) {
      try {
        const pricing = await getCustomerPricing(selectedCustomer._id || selectedCustomer.id, productName);
        if (pricing) {
          price = pricing.lastPrice;
        } else if (found) {
          price = found.retailPrice;
        }
      } catch (e) {
        if (found) price = found.retailPrice;
      }
    } else if (found) {
      price = found.retailPrice;
    }

    const unit = found?.unit || 'Pcs';
    const h = found?.height || 0;
    const w = found?.width || 0;
    const sqftPerPcs = (h > 0 && w > 0) ? (h * w) / 144 : (found?.sqftPerPcs || 0);

    setItems(items.map(item => {
      if (item.id !== id) return item;
      const q = parseFloat(item.qty) || 1;
      let totalSqft = q * sqftPerPcs;

      // If selling unit is Feet and product has no HxW dimensions, set totalSqft to qty directly
      if (unit === 'Feet' && totalSqft === 0) {
        totalSqft = q;
      }

      let pricePerSqft = price;
      const computedPrice = totalSqft > 0 && pricePerSqft > 0 ? parseFloat((totalSqft * pricePerSqft).toFixed(2)) : price;

      return {
        ...item,
        product: productName,
        variant: '',
        unit,
        price: computedPrice,
        pricePerSqft,
        height: h,
        width: w,
        sqftPerPcs: parseFloat(sqftPerPcs.toFixed(2)),
        totalSqft: parseFloat(totalSqft.toFixed(2)),
      };
    }));
    await updatePriceHint(id, productName);
  };


  // ── Validation ─────────────────────────────────────────────
  const hasPartialData = () =>
    customerName.trim() || customerPhone.trim() || billingAddress.trim() || items.some(i => i.product.trim());

  // ── Save invoice ───────────────────────────────────────────
  const handleSaveInvoice = async (overrideStatus) => {
    if (overrideStatus !== 'Draft') {
      if (!customerName.trim() || !customerPhone.trim()) {
        showToast('Please fill in Customer Name and Phone Number', 'error'); return;
      }
      const rawDigits = customerPhone.trim().replace(/\D/g, '');
      const d10 = rawDigits.length === 12 && rawDigits.startsWith('91') ? rawDigits.slice(2) : rawDigits;
      if (!/^[6-9]\d{9}$/.test(d10)) {
        showToast('Please enter a valid 10-digit mobile number (starts with 6-9)', 'error'); return;
      }
      if (items.some(i => !i.product.trim())) {
        showToast('Please ensure all items have a product selected', 'error'); return;
      }
    }

    const calculatedPayment = overrideStatus === 'Draft' ? 'Draft'
      : (paymentStatus.includes('Paid') ? 'Paid' : (paymentStatus.includes('Partially') ? 'Partial' : 'Pending'));

    const payload = {
      invoiceId,
      client: customerName.trim() || 'Draft Customer',
      phone: customerPhone.trim() || '',
      company: customerCompany.trim(),
      email: customerEmail.trim(),
      gst: customerGST.trim(),
      city: customerCity.trim(),
      state: customerState.trim(),
      address: billingAddress.trim(),
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      payment: calculatedPayment,
      delivery: 'Processing',
      items: items.filter(i => i.product.trim()).map(i => {
        const sqft = parseFloat(i.totalSqft) || 0;
        const pricePerSqft = parseFloat(i.pricePerSqft) || 0;
        const linePrice = sqft > 0 && pricePerSqft > 0 ? sqft * pricePerSqft : (parseInt(i.qty) || 0) * (parseFloat(i.price) || 0);
        return {
          product: i.product.trim(),
          variant: i.variant || '',
          unit: i.unit || 'Pcs',
          qty: parseInt(i.qty) || 0,
          height: parseFloat(i.height) || 0,
          width: parseFloat(i.width) || 0,
          sqftPerPcs: parseFloat(i.sqftPerPcs) || 0,
          totalSqft: sqft,
          pricePerSqft,
          price: parseFloat(i.price) || 0,
          disc: parseFloat(i.disc) || 0,
          tax: parseFloat(i.tax) || 0,
          total: linePrice * (1 - (parseFloat(i.disc) || 0) / 100),
        };
      }),

      subtotal: summary.subtotal,
      discount: summary.discount,
      tax: summary.tax,
      otherCharge: parseFloat(otherCharge) || 0,
      roundOff: parseFloat(roundOff) || 0,
      grandTotal: summary.grandTotal,
      previousBalance: summary.previousBalance || 0,
      netPayable: summary.netPayable,
      amountReceived: parseFloat(parseFloat(amountReceived).toFixed(2)) || 0,
      paymentStatus: overrideStatus === 'Draft' ? 'Draft' : paymentStatus,
      paymentMethod,
      notes: notes.trim(),
      customerType: 'retail',
      invoiceType: invoiceType.trim(),
      documentNumber: documentNumber.trim(),
    };

    try {
      if (isEditingDraft && draftData) {
        const draftId = draftData.id || draftData.invoiceId;
        if (draftId) await api.delete(`/invoices/${draftId}`);
      }
      await api.post('/invoices', payload);

      // ── Auto-sync to CRM ────────────────────────────────────
      if (overrideStatus !== 'Draft') {
        await syncFromInvoice(payload);
      }

      if (overrideStatus !== 'Draft') showToast('Invoice saved successfully!', 'success');
      else showToast('Draft saved!', 'info', 2000);
      if (onBack) onBack();
    } catch (error) {
      showToast(error.message || 'Error saving invoice', 'error');
    }
  };

  const handleBack = async () => {
    if (hasPartialData()) await handleSaveInvoice('Draft');
    else if (onBack) onBack();
  };

  useEffect(() => {
    const h = (e) => { if (hasPartialData()) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  });

  // Handle Enter as Tab for easy navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        const activeElement = document.activeElement;
        
        // Don't intercept Enter on textareas (so user can insert newlines)
        // or on buttons (so user can click them with Enter)
        if (
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.tagName === 'BUTTON'
        ) {
          return;
        }

        e.preventDefault();
        
        // Find all focusable elements
        const focusableElements = Array.from(
          document.querySelectorAll(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        
        const index = focusableElements.indexOf(activeElement);
        // Find next focusable element that is actually visible (offsetParent !== null checks visibility)
        let nextIndex = index + 1;
        while (nextIndex < focusableElements.length) {
          if (focusableElements[nextIndex].offsetParent !== null) {
            focusableElements[nextIndex].focus();
            break;
          }
          nextIndex++;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const inputClass = "w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all";

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <ToastContainer />

      {isEditingDraft && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-xs font-bold text-amber-700">Editing Draft: <span className="font-mono">{invoiceId}</span> — click <strong>Save Invoice</strong> to finalize.</p>
        </div>
      )}

      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-3">
          <button onClick={handleBack} className="p-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 transition-colors cursor-pointer text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">New Invoice / Bill</h1>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Drafting Invoice #{invoiceId}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2.5">
          <button onClick={() => showToast('Export successful!', 'success')} className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
            <FileDown className="w-4 h-4" /><span>Export PDF</span>
          </button>
          <button onClick={() => handleSaveInvoice('Draft')} className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-650 hover:bg-slate-50 cursor-pointer shadow-sm">
            <Save className="w-4 h-4 text-slate-400" /><span>Save Draft</span>
          </button>
          <button onClick={() => handleSaveInvoice('Pending')} className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold text-white cursor-pointer shadow-md shadow-emerald-500/10">
            <Check className="w-4 h-4" /><span>Save Invoice</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top: Bill Settings + Customer — full width */}
        <div className="lg:col-span-3 space-y-6">

          {/* Bill Settings Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-50 pb-2">Bill Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoice Date</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Invoice Type <span className="text-slate-400 font-normal">(Optional)</span></label>
                <input type="text" maxLength={50} value={invoiceType} onChange={e => setInvoiceType(e.target.value)} placeholder="e.g. Tax Invoice" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Document Number</label>
                <input type="text" maxLength={50} value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="e.g. 1, mm1..." className={inputClass} />
              </div>
            </div>
          </div>

          {/* Customer Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
              <h3 className="font-bold text-slate-800 text-base">Customer Details</h3>
            </div>

            {/* ── Smart Customer Search ── */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Search Existing Customer
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={customerSearchQuery}
                  onChange={e => { setCustomerSearchQuery(e.target.value); setShowCustomerDropdown(true); }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onKeyDown={handleCustomerKeyDown}
                  placeholder="Search by name, mobile, GST, company..."
                  className="w-full pl-9 pr-10 py-2.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
                {(customerSearchQuery || selectedCustomer) && (
                  <button onClick={() => { setCustomerSearchQuery(''); setSelectedCustomer(null); setShowCustomerDropdown(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Dropdown */}
                {showCustomerDropdown && (customerSearchResults.length > 0 || customerSearchQuery.length > 1) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-y-auto max-h-64">
                    {customerSearchResults.length > 0 ? (
                      <>
                        {customerSearchResults.map((c, index) => (
                          <button key={c.id} id={`customer-item-${index}`} onClick={() => fillCustomerFields(c)}
                            className={`w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer text-left border-b border-slate-50 last:border-0 ${customerHighlightedIndex === index ? 'bg-emerald-100' : 'hover:bg-emerald-50'}`}>
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                              {c.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{c.mobile}{c.company ? ` · ${c.company}` : ''}</p>
                            </div>
                            <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{c.code}</span>
                          </button>
                        ))}
                        <div className="border-t border-slate-100">
                          <button id={`customer-item-${customerSearchResults.length}`} onClick={() => { setShowCustomerDropdown(false); setCustomerName(customerSearchQuery); }}
                            className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-emerald-700 cursor-pointer transition-colors ${customerHighlightedIndex === customerSearchResults.length ? 'bg-emerald-100' : 'hover:bg-emerald-50'}`}>
                            <Plus className="w-3.5 h-3.5" /> Continue as new customer
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="px-4 py-4">
                        <p className="text-xs text-slate-500 font-medium mb-2">No customers found for "{customerSearchQuery}"</p>
                        <button id={`customer-item-0`} onClick={() => { setShowCustomerDropdown(false); setCustomerName(customerSearchQuery); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 cursor-pointer transition-colors ${customerHighlightedIndex === 0 ? 'bg-emerald-100' : 'bg-emerald-50 hover:bg-emerald-100'}`}>
                          <Plus className="w-3.5 h-3.5" /> Add as new customer after invoice
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-xs font-bold text-emerald-700">Customer selected: {selectedCustomer.name} ({selectedCustomer.code})</p>
                </div>
              )}
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name <span className="text-rose-500 font-extrabold">*</span></label>
                <input type="text" required maxLength={100} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer Name" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone Number <span className="text-rose-500 font-extrabold">*</span></label>
                <input type="tel" required maxLength={10} value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile number"
                  className={`w-full px-4 py-2.5 bg-slate-50/50 border rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all ${customerPhone.length > 0 && customerPhone.length !== 10 ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`}
                />
              </div>
            </div>

            {/* Company + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Company Name</label>
                <input type="text" maxLength={100} value={customerCompany} onChange={e => setCustomerCompany(e.target.value)} placeholder="Company (optional)" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email</label>
                <input type="email" maxLength={100} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="customer@email.com" className={inputClass} />
              </div>
            </div>

            {/* GST + City + State */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">GST Number</label>
                <input type="text" value={customerGST} onChange={e => setCustomerGST(e.target.value.toUpperCase())} placeholder="GST No." maxLength={15} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">City</label>
                <input type="text" maxLength={50} value={customerCity} onChange={e => setCustomerCity(e.target.value)} placeholder="City" className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">State</label>
                <input type="text" maxLength={50} value={customerState} onChange={e => setCustomerState(e.target.value)} placeholder="State" className={inputClass} />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Billing Address</label>
              <textarea rows="2" maxLength={200} value={billingAddress} onChange={e => setBillingAddress(e.target.value)} placeholder="Full address..." className={inputClass} />
            </div>
          </div>
        </div>

        {/* Order Items — full width row */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-50 pb-3">Order Items</h3>
            <div className="overflow-visible">
              <table className="w-full text-left text-xs" style={{minWidth:'900px'}}>
                <thead>
                  <tr className="text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                    <th className="pb-3 w-[24%]">Product</th>
                    <th className="pb-3 w-[14%]">Variant</th>
                    <th className="pb-3 w-[7%] text-center">Unit</th>
                    <th className="pb-3 w-[7%] text-center">QTY</th>
                    <th className="pb-3 w-[12%] text-center">Sq.Ft / Feet</th>
                    <th className="pb-3 w-[13%] text-right">Price/Sq.Ft (₹)</th>
                    <th className="pb-3 w-[10%] text-right">Amount (₹)</th>
                    <th className="pb-3 w-[7%] text-center">Tax %</th>
                    <th className="pb-3 w-[2%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold">
                  {items.map((item) => {
                    const hint = priceHints[item.id];
                    const lineAmt = item.totalSqft > 0 && item.pricePerSqft > 0
                      ? (item.totalSqft * item.pricePerSqft)
                      : ((parseFloat(item.qty) || 0) * (parseFloat(item.price) || 0));
                    return (
                      <tr key={item.id}>
                        {/* Product */}
                        <td className="py-3 pr-2 align-top">
                          <ProductSearch
                            item={item}
                            productList={productList}
                            onChange={(val) => handleItemChange(item.id, 'product', val)}
                            onSelect={(val) => handleProductSelect(item.id, val)}
                          />
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {item.unit === 'Feet' && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-bold">Unit: Feet</span>
                            )}
                            {item.height > 0 && item.width > 0 && (
                              <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">{item.height}" × {item.width}" ({item.sqftPerPcs.toFixed(3)} ft²/pcs)</span>
                            )}
                          </div>
                        </td>
                        {/* Variant */}
                        <td className="py-3 pr-2 align-top">
                          {(() => {
                            const prod = productList.find(p => p.name === item.product);
                            const hasDetails = prod?.variantDetails?.length > 0;
                            const hasLegacy = prod?.variants?.length > 0;
                            if (hasDetails) return (
                              <select value={item.variant} onChange={e => handleItemChange(item.id, 'variant', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-[11px] font-semibold text-slate-600 cursor-pointer">
                                <option value="">Select Variant...</option>
                                {prod.variantDetails.map(vd => <option key={vd.sku} value={vd.variantName}>{vd.variantName} (Stock: {vd.qty})</option>)}
                              </select>
                            );
                            if (hasLegacy) return (
                              <select value={item.variant} onChange={e => handleItemChange(item.id, 'variant', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none text-[11px] cursor-pointer">
                                <option value="">Select Variant...</option>
                                {prod.variants.map(vg => vg.options.map(opt => <option key={`${vg.group}-${opt}`} value={`${vg.group}: ${opt}`}>{vg.group}: {opt}</option>))}
                              </select>
                            );
                            return <select disabled className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-lg text-[11px] opacity-40 cursor-not-allowed"><option>No Variants</option></select>;
                          })()}
                        </td>
                        {/* Unit Selector */}
                        <td className="py-3 pr-2 align-top">
                          <select
                            value={item.unit || 'Pcs'}
                            onChange={e => handleItemChange(item.id, 'unit', e.target.value)}
                            className="w-full px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-[11px] font-bold text-slate-700 cursor-pointer">
                            <option value="Pcs">Pcs</option>
                            <option value="Feet">Feet</option>
                          </select>
                        </td>
                        {/* QTY */}
                        <td className="py-3 pr-2 align-top">
                          <input type="number" min="1" value={item.qty === 0 ? '' : item.qty}
                            onChange={e => handleItemChange(item.id, 'qty', e.target.value)} onKeyDown={preventInvalidNumberInput}
                            className="w-full px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none text-center" />
                          {item.unit === 'Feet' && (
                            <div className="mt-1 text-[9px] text-emerald-600 font-bold text-center">Feet</div>
                          )}
                        </td>
                        {/* Sq.Ft / Feet — calculated (read-only) */}
                        <td className="py-3 pr-2 align-top">
                          <input
                            type="number"
                            readOnly
                            disabled
                            value={item.totalSqft === 0 ? '' : item.totalSqft}
                            placeholder="0.00"
                            className="w-full px-2 py-2 bg-slate-100 border border-slate-200 rounded-lg text-center text-slate-500 font-bold cursor-not-allowed outline-none" />
                          {item.sqftPerPcs > 0 ? (
                            <div className="mt-1 text-[9px] text-slate-400 text-center">{item.sqftPerPcs.toFixed(2)} ft²/pcs</div>
                          ) : item.unit === 'Feet' ? (
                            <div className="mt-1 text-[9px] text-emerald-700 font-bold text-center">Total Feet</div>
                          ) : null}
                        </td>
                        {/* Price per Sq.Ft */}
                        <td className="py-3 pr-2 align-top">
                          <input
                            type="number" min="0" step="0.01"
                            value={item.pricePerSqft === 0 ? '' : item.pricePerSqft}
                            onChange={e => handleItemChange(item.id, 'pricePerSqft', e.target.value)}
                            onKeyDown={preventInvalidNumberInput}
                            placeholder="0.00"
                            className="w-full px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 text-right" />
                          {hint && (
                            <div className="mt-1 px-1 space-y-0.5">
                              <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 justify-end">
                                <Clock className="w-2.5 h-2.5" /> Last: ₹{hint.lastPrice}
                              </p>
                            </div>
                          )}
                        </td>
                        {/* Line Amount (read-only) */}
                        <td className="py-3 pr-2 align-top">
                          <div className="w-full px-2 py-2 bg-slate-100 border border-slate-200 rounded-lg text-right text-slate-800 font-extrabold">
                            ₹{lineAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        {/* Tax % */}
                        <td className="py-3 pr-2 align-top">
                          <select value={item.tax} onChange={e => handleItemChange(item.id, 'tax', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-2 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none cursor-pointer text-center">
                            {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                        {/* Delete */}
                        <td className="py-3 text-right align-top">
                          <button type="button" onClick={() => handleRemoveItemRow(item.id)} disabled={items.length === 1}
                            className={`p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer ${items.length === 1 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <button type="button" onClick={handleAddItemRow}
              className="w-full py-3 border border-dashed border-slate-200 hover:border-emerald-500 rounded-xl flex items-center justify-center space-x-1.5 text-xs text-slate-500 hover:text-emerald-600 font-bold transition-all bg-slate-50/20 hover:bg-emerald-50/10 cursor-pointer">
              <Plus className="w-4 h-4" /><span>Add Another Row</span>
            </button>
        </div>

        {/* Bottom: Payment Summary + Notes — full width 2-col row */}
        <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-50 pb-3">Payment Summary</h3>
            <div className="space-y-3.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="text-slate-800 font-bold">₹{summary.subtotal.toFixed(2)}</span>
              </div>
              {summary.discount > 0 && (
                <div className="flex justify-between items-center text-emerald-600">
                  <span>Discount</span>
                  <span className="font-bold">- ₹{summary.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Estimated Tax (GST)</span>
                <span className="text-slate-800 font-bold">+ ₹{summary.tax.toFixed(2)}</span>
              </div>

              {/* Other Charge & Round Off Inputs */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600">Other Charge (₹)</span>
                  <input type="number" min="0" step="0.01" value={otherCharge === 0 ? '' : otherCharge}
                    onChange={e => setOtherCharge(e.target.value)} onKeyDown={preventInvalidNumberInput} placeholder="0.00"
                    className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-slate-800 focus:outline-none focus:border-emerald-500" />
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-600">Round Off (₹)</span>
                    <button type="button" onClick={() => {
                      const raw = summary.subtotal - summary.discount + summary.tax + (parseFloat(otherCharge) || 0);
                      const rounded = Math.round(raw);
                      const diff = parseFloat((rounded - raw).toFixed(2));
                      setRoundOff(diff);
                    }} className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold hover:bg-emerald-200 transition-colors cursor-pointer" title="Auto round off to nearest integer">
                      Auto
                    </button>
                  </div>
                  <input type="number" step="0.01" value={roundOff === 0 ? '' : roundOff}
                    onChange={e => setRoundOff(e.target.value)} placeholder="0.00"
                    className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-slate-800 focus:outline-none focus:border-emerald-500" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-800">Current Bill Total</span>
                <span className="text-base font-extrabold text-slate-900">₹{summary.grandTotal.toFixed(2)}</span>
              </div>

              {/* Previous Pending Balance Section */}
              {detectedPendingBalance > 0 && (
                includePreviousBalance ? (
                  <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">
                          Pending Balance
                        </span>
                        <span className="text-xs font-bold text-amber-900">
                          Previous Bills
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePreviousBalance}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg shadow-sm transition-colors cursor-pointer"
                        title="Remove from this bill (will remain pending for next bill)"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Delete</span>
                      </button>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs text-amber-800 font-medium">Previous Pending Bill Balance:</span>
                      <span className="text-sm font-extrabold text-amber-900">
                        + ₹{detectedPendingBalance.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-700/90 leading-tight">
                      Automatically detected from earlier unpaid bills. Included in Net Payable below.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl flex items-center justify-between gap-3">
                    <div className="text-left">
                      <p className="text-xs font-semibold text-slate-700">
                        Previous balance of <span className="font-extrabold font-mono text-slate-900">₹{detectedPendingBalance.toFixed(2)}</span> removed from this bill
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Will remain pending and shift to the next bill
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddBackPreviousBalance}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Add Back</span>
                    </button>
                  </div>
                )
              )}

              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm">
                <span className="font-extrabold text-slate-900">Net Payable / Total Due</span>
                <span className="text-lg font-black text-emerald-700">₹{summary.netPayable.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Received (₹)</label>
              <input type="number" min="0" value={amountReceived === 0 ? '' : amountReceived}
                onChange={e => setAmountReceived(e.target.value)} onKeyDown={preventInvalidNumberInput} placeholder="0"
                className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500" />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs font-bold">
              <span className="text-slate-500">Pending Balance:</span>
              <span className="text-sm font-extrabold text-emerald-600">₹{summary.pendingBalance.toFixed(2)}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Status</label>
              <select value={paymentStatus} onChange={e => {
                const newStatus = e.target.value;
                setPaymentStatus(newStatus);
                if (newStatus === 'Paid') {
                  setAmountReceived(summary.netPayable);
                } else {
                  setAmountReceived(0);
                }
              }}
                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer">
                <option value="Pending (Credit)">Pending (Credit)</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially Paid</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer">
                {['Cash', 'Card', 'UPI', 'Net Banking', 'Cheque'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-50 pb-3">Notes &amp; Terms</h3>
            <textarea rows="3" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add terms and conditions..." className={inputClass} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewBilling;
