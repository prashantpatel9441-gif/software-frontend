import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { Save, Building2, Landmark, FileText, CheckCircle2 } from 'lucide-react';

export const Settings = () => {
  const { showToast, ToastContainer } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    state: '',
    telephone: '',
    email: '',
    bankName: '',
    accountNumber: '',
    branchIfsc: '',
    termsAndConditions: '',
    notes: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/settings');
      if (data) {
        setFormData({
          companyName: data.companyName || '',
          address: data.address || '',
          state: data.state || '',
          telephone: data.telephone || '',
          email: data.email || '',
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          branchIfsc: data.branchIfsc || '',
          termsAndConditions: data.termsAndConditions || '',
          notes: data.notes || ''
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('Failed to load settings', 'error');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/settings', formData);
      showToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all";
  const labelClass = "text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5";

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-5xl">
      <ToastContainer />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Company Settings</h1>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">Manage your company profile, bank details, and invoice terms</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={loading}
          className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-sm font-bold text-white shadow-md shadow-emerald-500/10 transition-all disabled:opacity-50"
        >
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Changes</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Company Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-50 pb-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-base">Company Information</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Company Name</label>
              <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} placeholder="GreenAdmin Pvt Ltd" className={inputClass} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Telephone / Phone</label>
                <input type="text" name="telephone" value={formData.telephone} onChange={handleChange} placeholder="+91 XXXXXXXXXX" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="admin@example.com" className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className={labelClass}>State</label>
                <input type="text" name="state" value={formData.state} onChange={handleChange} placeholder="Gujarat" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Full Address</label>
              <textarea name="address" rows="3" value={formData.address} onChange={handleChange} placeholder="A-801, Samudra Complex..." className={inputClass} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Bank Details */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-50 pb-2">
              <Landmark className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-base">Bank Details</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Bank Name</label>
                <input type="text" name="bankName" value={formData.bankName} onChange={handleChange} placeholder="HDFC Bank" className={inputClass} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Account Number</label>
                  <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} placeholder="XXXXXXXXXXXX" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Branch & IFSC Code</label>
                  <input type="text" name="branchIfsc" value={formData.branchIfsc} onChange={handleChange} placeholder="HDFC0001234" className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Defaults */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-50 pb-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-base">Invoice Output</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Terms & Conditions</label>
                <textarea name="termsAndConditions" rows="4" value={formData.termsAndConditions} onChange={handleChange} placeholder="1. Payment to be made by cheque..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea name="notes" rows="2" value={formData.notes} onChange={handleChange} placeholder="Thank You For Your Business." className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
