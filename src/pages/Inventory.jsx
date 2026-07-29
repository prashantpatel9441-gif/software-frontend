import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '../components/Toast';
import { api } from '../services/api';
import {
  Search,
  Plus,
  X,
  Download,
  AlertTriangle,
  CheckCircle,
  Package,
  TrendingUp,
  Boxes,
  HelpCircle,
  Pencil,
  Trash2,
  AlertCircle,
  TrendingDown,
  BarChart3,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  ArrowLeft
} from 'lucide-react';

export const Inventory = () => {
  const { showToast, ToastContainer } = useToast();
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedWarehouse, setSelectedWarehouse] = useState('All');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(10); // Items per page
  const [activeTab, setActiveTab] = useState('products');
  const [viewingCategory, setViewingCategory] = useState(null);

  const [isReorderingCategories, setIsReorderingCategories] = useState(false);
  const [localCategories, setLocalCategories] = useState([]);
  const [draggedCatIdx, setDraggedCatIdx] = useState(null);

  const [metrics, setMetrics] = useState({
    totalInventoryValue: 0,
    totalItemsInStock: 0,
    lowStockAlerts: 0,
    deadStockItems: 0,
    uniqueCategories: ['All'],
    uniqueWarehouses: ['All'],
    lowStockItems: []
  });

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add'); // 'add' | 'edit'
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isValuationOpen, setIsValuationOpen] = useState(false);

  // Form State
  const [itemForm, setItemForm] = useState({
    sku: '',
    name: '',
    category: 'Necklaces',
    warehouse: 'Main WH - A1',
    quantity: 0,
    unitPrice: 0,
    status: 'In Stock',
    variant: '',
    baseSku: ''
  });

  // Fetch inventory
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await api.get('/inventory', {
        params: {
          page: 1, // We fetch all and paginate on frontend
          limit: 10000,
          search: searchTerm,
          category: selectedCategory,
          warehouse: selectedWarehouse
        }
      });
      if (data && data.inventory) {
        setInventory(data.inventory);
        // We will calculate totalPages on the frontend after grouping
        if (data.metrics) {
          setMetrics(prev => ({...prev, ...data.metrics}));
        }
      } else if (Array.isArray(data)) {
        setInventory(data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const preventInvalidNumberInput = (e) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await api.get('/products', { params: { limit: 1000 } });
      if (data && data.products) {
        setProducts(data.products);
      } else if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Sync all products into inventory, then refresh
  const syncAndRefresh = async () => {
    try {
      setSyncing(true);
      setSyncMsg('');
      const result = await api.post('/inventory/sync', {});
      if (result && result.message) {
        setSyncMsg(result.message);
        setTimeout(() => setSyncMsg(''), 4000);
      }
      await fetchInventory();
    } catch (error) {
      console.error('Error syncing products to inventory:', error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Auto-sync new products into inventory when the page loads
    syncAndRefresh();
  }, []);
  // Fetch when pagination or filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInventory();
    }, 400); // Debounce
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, selectedWarehouse]);

  // Derived Summary Metrics from Backend
  const { totalInventoryValue, totalItemsInStock, lowStockAlerts, deadStockItems, uniqueCategories, uniqueWarehouses, lowStockItems, categoryStats = [] } = metrics;

  useEffect(() => {
    if (categoryStats.length > 0) {
      const savedOrder = JSON.parse(localStorage.getItem('categoryOrder')) || [];
      const sorted = [...categoryStats].sort((a, b) => {
        const indexA = savedOrder.indexOf(a.name);
        const indexB = savedOrder.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
      setLocalCategories(sorted);
    }
  }, [categoryStats]);

  const handleDragStart = (e, index) => {
    setDraggedCatIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedCatIdx === null || draggedCatIdx === index) return;
    
    const newItems = [...localCategories];
    const draggedItem = newItems[draggedCatIdx];
    newItems.splice(draggedCatIdx, 1);
    newItems.splice(index, 0, draggedItem);
    
    setDraggedCatIdx(index);
    setLocalCategories(newItems);
  };

  const handleDragEnd = () => {
    setDraggedCatIdx(null);
  };

  const saveCategoryOrder = () => {
    const order = localCategories.map(c => c.name);
    localStorage.setItem('categoryOrder', JSON.stringify(order));
    setIsReorderingCategories(false);
    showToast('Category positions saved successfully!', 'success');
  };

  // Search and Double Filters (Already handled by backend, but we map it directly)
  const filteredInventory = inventory;

  // Apply frontend pagination directly to the flat list
  const computedTotalPages = Math.max(1, Math.ceil(filteredInventory.length / limit));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredInventory.slice(start, start + limit);
  }, [filteredInventory, currentPage, limit]);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (computedTotalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= computedTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      
      let startPage = Math.max(2, currentPage - 2);
      let endPage = Math.min(computedTotalPages - 1, currentPage + 2);
      
      if (currentPage <= 3) {
        endPage = 5;
      } else if (currentPage >= computedTotalPages - 2) {
        startPage = computedTotalPages - 4;
      }

      if (startPage > 2) pages.push('...');
      for (let i = startPage; i <= endPage; i++) pages.push(i);
      if (endPage < computedTotalPages - 1) pages.push('...');
      
      pages.push(computedTotalPages);
    }
    return pages;
  };

  // Ensure currentPage doesn't exceed computedTotalPages
  useEffect(() => {
    if (currentPage > computedTotalPages) {
      setCurrentPage(computedTotalPages);
    }
  }, [computedTotalPages, currentPage]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
    setCurrentPage(1);
  };
  const handleWarehouseChange = (e) => {
    setSelectedWarehouse(e.target.value);
    setCurrentPage(1);
  };

  // Export CSV Helper
  const exportToCSV = async () => {
    try {
      const data = await api.get('/inventory', {
        params: { limit: 10000, search: searchTerm, category: selectedCategory, warehouse: selectedWarehouse }
      });
      const exportData = data.inventory || data;
      
      const csvRows = [];
      const headers = ['SKU', 'PRODUCT NAME', 'CATEGORY', 'WAREHOUSE', 'QUANTITY', 'UNIT PRICE', 'TOTAL VALUE', 'STATUS'];
      csvRows.push(headers.join(','));

      exportData.forEach(item => {
      const totalValue = item.quantity * item.unitPrice;
      const values = [
        `"${item.sku}"`,
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.category}"`,
        `"${item.warehouse}"`,
        item.quantity,
        item.unitPrice,
        totalValue,
        `"${item.status}"`
      ];
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Export successful!', 'success');
    } catch (error) {
      console.error('Error exporting inventory:', error);
      showToast('Export failed!', 'error');
    }
  };

  // Open Form Helpers
  const [variantQuantities, setVariantQuantities] = useState({});
  const [expandedProducts, setExpandedProducts] = useState({});

  const toggleExpand = (sku) => {
    setExpandedProducts(prev => ({ ...prev, [sku]: !prev[sku] }));
  };

  const openAddModal = async () => {
    if (products.length === 0) {
      await fetchProducts();
    }
    setItemForm({
      sku: '',
      name: '',
      category: 'Necklaces',
      warehouse: 'Main WH - A1',
      quantity: '',
      unitPrice: '',
      status: 'In Stock',
      variant: '',
      baseSku: ''
    });
    setVariantQuantities({});
    setModalType('add');
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setItemForm({
      sku: item.sku,
      name: item.name,
      category: item.category,
      warehouse: item.warehouse,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      status: item.status,
      variant: item.variant || '',
      baseSku: item.sku
    });
    setModalType('edit');
    setIsModalOpen(true);
  };

  // Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (modalType === 'add' && Object.keys(variantQuantities).length > 0) {
      // Bulk Submit
      const itemsToSubmit = [];
      Object.entries(variantQuantities).forEach(([variantName, qty]) => {
        if (qty !== '' && parseInt(qty) >= 0) {
          const cleanV = variantName.replace(/[^a-zA-Z0-9]/g, '');
          const qtyNum = parseInt(qty) || 0;
          let finalStatus = 'In Stock';
          if (qtyNum === 0) finalStatus = 'Out of Stock';
          else if (qtyNum < 10) finalStatus = 'Low Stock';
          
          itemsToSubmit.push({
            sku: `${itemForm.baseSku}-${cleanV}`,
            baseSku: itemForm.baseSku,
            name: itemForm.name.trim(),
            category: itemForm.category,
            warehouse: itemForm.warehouse,
            quantity: qtyNum,
            unitPrice: parseFloat(itemForm.unitPrice) || 0,
            status: finalStatus,
            variant: variantName
          });
        }
      });
      
      try {
        await api.post('/inventory/bulk', { items: itemsToSubmit });
        fetchInventory();
        setIsModalOpen(false);
      } catch (error) {
        console.error('Error saving inventory:', error);
        showToast(error.message || 'Error saving inventory', 'error');
      }
      return;
    }

    if (!itemForm.sku.trim() || !itemForm.name.trim()) return;

    // Auto calculate status from quantity if not manually flagged dead stock
    let finalStatus = itemForm.status;
    const qtyNum = parseInt(itemForm.quantity) || 0;
    if (finalStatus !== 'Dead Stock') {
      if (qtyNum === 0) {
        finalStatus = 'Out of Stock';
      } else if (qtyNum < 10) {
        finalStatus = 'Low Stock';
      } else {
        finalStatus = 'In Stock';
      }
    }

    const itemData = {
      sku: itemForm.sku.trim(),
      name: itemForm.name.trim(),
      category: itemForm.category,
      warehouse: itemForm.warehouse,
      quantity: qtyNum,
      unitPrice: parseFloat(itemForm.unitPrice) || 0,
      status: finalStatus,
      variant: itemForm.variant
    };

    try {
      if (modalType === 'add') {
        const exists = inventory.some(item => item.sku.toLowerCase() === itemData.sku.toLowerCase());
        if (exists) {
          showToast("An item with this SKU already exists!", 'error');
          return;
        }
        await api.post('/inventory', itemData);
      } else {
        await api.put(`/inventory/${itemForm.sku}`, itemData);
      }
      showToast(modalType === 'add' ? 'Inventory item added!' : 'Inventory item updated!', 'success');
      fetchInventory();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      showToast(error.message || 'Error saving inventory item', 'error');
    }
  };


  // Delete Handler — handles single item, group by baseSku, and group by name
  const handleDeleteItem = async (id) => {
    try {
      if (id && id.startsWith('name:')) {
        // Delete ALL inventory items with this product name
        const productName = id.replace('name:', '');
        const itemsToDelete = inventory.filter(item => item.name === productName);
        await Promise.all(itemsToDelete.map(item => api.delete(`/inventory/${item.sku}`)));
      } else if (id && id.startsWith('group-')) {
        // Legacy: delete all items matching baseSku
        const baseSku = id.replace('group-', '');
        const itemsToDelete = inventory.filter(item => (item.baseSku || item.sku) === baseSku);
        await Promise.all(itemsToDelete.map(item => api.delete(`/inventory/${item.sku}`)));
      } else {
        await api.delete(`/inventory/${id}`);
      }
      setDeleteConfirmId(null);
      fetchInventory();
    } catch (error) {
      console.error('Error deleting inventory item:', error);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative pb-12">
      <ToastContainer />

      {/* Top Title/Sub Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1e293b] tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1 font-semibold">Track stock movements, valuation, and warehouses across your enterprise</p>
        </div>

        {/* Audit controls */}
        <div className="flex items-center gap-2">
          {/* Valuation Report */}
          <button
            onClick={() => setIsValuationOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Valuation Report</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Inventory Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Inventory Value</p>
            <p className="text-2xl font-black text-[#1e293b]">₹{totalInventoryValue.toLocaleString('en-IN')}</p>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              +2.4% from last month
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        {/* Total Items in Stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Items in Stock</p>
            <p className="text-2xl font-black text-[#1e293b]">{totalItemsInStock.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-450 font-bold mt-1.5">Across {uniqueWarehouses.length - 1} Warehouses</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</p>
            <p className="text-2xl font-black text-emerald-600">{lowStockAlerts} Items</p>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
              Require immediate restock
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Dead Stock Items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dead Stock Items</p>
            <p className="text-2xl font-black text-slate-700">{deadStockItems} Items</p>
            <p className="text-[10px] text-slate-450 font-bold mt-1.5">No movement in 90 days</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Critical Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-rose-50/40 border border-rose-200/60 rounded-2xl shadow-sm relative overflow-hidden mt-6">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl flex-shrink-0 shadow-sm animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-extrabold text-rose-900 tracking-tight">Critical Low Stock Alert</h3>
                <p className="text-sm text-rose-700/80 mt-0.5 font-medium mb-4">
                  {lowStockItems.length} items have dropped below the minimum threshold (10 units) and require immediate restocking.
                </p>
                
                <div className="bg-white border border-rose-100/60 rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-[220px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-rose-50/50 sticky top-0 z-10 backdrop-blur-sm">
                        <tr>
                          <th className="py-2.5 px-4 font-extrabold text-rose-800 text-[10px] uppercase tracking-wider">Product Name & Variant</th>
                          <th className="py-2.5 px-4 font-extrabold text-rose-800 text-[10px] uppercase tracking-wider text-right">Remaining Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-50">
                        {lowStockItems.map((item, idx) => (
                          <tr key={item.sku || idx} className="hover:bg-rose-50/30 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700 text-xs">{item.name}</span>
                                {item.variant && (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                                    {item.variant}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black tracking-wide ${item.quantity === 0 ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'}`}>
                                {item.quantity} units
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex justify-between items-center mt-8 mb-2 border-b border-slate-100 pb-4 overflow-x-auto no-scrollbar gap-4">
        <div className="flex gap-3">
          <button 
            onClick={() => { setActiveTab('products'); setViewingCategory(null); setSelectedCategory('All'); setIsReorderingCategories(false); }}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'products' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            All Stock List
          </button>
          <button 
            onClick={() => { setActiveTab('categories'); setViewingCategory(null); setSelectedCategory('All'); }}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'categories' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Browse by Category
          </button>
        </div>

        {activeTab === 'categories' && !viewingCategory && (
          <div className="flex items-center">
            {isReorderingCategories ? (
              <button 
                onClick={saveCategoryOrder}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-emerald-700 transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle className="w-4 h-4" /> Save Positions
              </button>
            ) : (
              <button 
                onClick={() => setIsReorderingCategories(true)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
              >
                <TrendingUp className="w-4 h-4" /> Edit Positions
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'categories' && !viewingCategory ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4 mb-8">
          {localCategories.map((stat, idx) => (
            <div 
              key={stat.name}
              draggable={isReorderingCategories}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              onClick={() => {
                if (!isReorderingCategories) {
                  setSelectedCategory(stat.name);
                  setViewingCategory(stat.name);
                }
              }}
              className={`bg-white rounded-2xl border ${isReorderingCategories ? 'border-dashed border-emerald-400 cursor-move shadow-md opacity-90' : 'border-slate-100 cursor-pointer shadow-sm hover:shadow-lg hover:border-emerald-200 group transform hover:-translate-y-1'} p-6 transition-all`}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={`p-3 rounded-2xl shadow-sm transition-all ${isReorderingCategories ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                  <Tag className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-lg leading-tight truncate">{stat.name}</h3>
              </div>
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Total Items</span>
                  <span className="font-black text-slate-800 text-sm">{stat.count}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Total Value</span>
                  <span className="font-black text-[#1e293b]">₹{stat.value.toLocaleString('en-IN')}</span>
                </div>
              </div>
              {isReorderingCategories && (
                <div className="mt-4 text-center text-[10px] font-bold text-emerald-500">
                  Drag to move
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
      <>
      {activeTab === 'categories' && viewingCategory && (
        <div className="mb-2 mt-4 animate-fade-in">
          <button onClick={() => { setViewingCategory(null); setSelectedCategory('All'); }} className="flex items-center text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl w-fit transition-all hover:bg-emerald-100">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Categories
          </button>
          <h2 className="text-xl font-black text-slate-800 mt-4 mb-2">{viewingCategory} Products</h2>
        </div>
      )}
      {/* Action Bar (Filters & Search) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4 mt-4 mb-6">

        {/* Left Side Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Search SKU/Product */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by SKU or Product Name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
          >
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
            ))}
          </select>

          {/* Warehouse Dropdown */}
          <select
            value={selectedWarehouse}
            onChange={handleWarehouseChange}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
          >
            {uniqueWarehouses.map(wh => (
              <option key={wh} value={wh}>{wh === 'All' ? 'All Warehouses' : wh}</option>
            ))}
          </select>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Sync Status Message */}
          {syncMsg && (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold animate-fade-in">
              ✓ {syncMsg}
            </span>
          )}

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-550" />
            <span>Export</span>
          </button>

          {/* Sync Products Button */}
          <button
            onClick={syncAndRefresh}
            disabled={syncing}
            className={`flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-500/10 ${syncing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            <Plus className="w-4 h-4" />
            <span>{syncing ? 'Syncing...' : 'Sync Products'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid Table Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">Sr. No.</th>
                <th className="py-3.5 px-6">SKU</th>
                <th className="py-3.5 px-6">Product Name</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6">Warehouse</th>
                <th className="py-3.5 px-6">Quantity</th>
                <th className="py-3.5 px-6">Total Value</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right pr-6 w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-750 font-semibold">
              {(() => {
                if (paginatedItems.length === 0) {
                  return (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400 italic">
                        No matching stock items found
                      </td>
                    </tr>
                  );
                }

                return paginatedItems.map((item) => {
                  let statusStr = 'In Stock';
                  if (item.quantity === 0) statusStr = 'Out of Stock';
                  else if (item.quantity < 10) statusStr = 'Low Stock';

                  const statusColors = (s) => ({
                    'In Stock': 'bg-emerald-50 text-emerald-700 border-emerald-100',
                    'Low Stock': 'bg-emerald-50/50 text-emerald-500 border-emerald-100',
                    'Out of Stock': 'bg-slate-100 text-slate-500 border-slate-200',
                    'Dead Stock': 'bg-slate-50 text-slate-600 border-slate-200',
                  }[s] || 'bg-slate-50 text-slate-600 border-slate-200');

                  return (
                    <tr key={item.sku} className="hover:bg-slate-50/40 transition-colors bg-white">
                      <td className="py-3.5 px-6 font-bold text-slate-800 align-top">{item.srNo === 999999 ? '—' : (item.srNo || '—')}</td>
                      <td className="py-3.5 px-6 text-slate-400 font-mono text-[11px] align-top">{item.sku}</td>
                      <td className="py-3.5 px-6 align-top">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="text-[#1e293b] font-bold text-sm">
                              {item.name}
                              {item.variant && <span className="ml-2 text-slate-500 font-normal text-xs bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{item.variant}</span>}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-slate-500 align-top">{item.category}</td>
                      <td className="py-3.5 px-6 text-slate-500 font-medium align-top">{item.warehouse}</td>
                      <td className="py-3.5 px-6 text-slate-800 font-extrabold text-sm align-top">{item.quantity}</td>
                      <td className="py-3.5 px-6 text-[#1e293b] font-extrabold align-top">₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-6 align-top">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wide border ${statusColors(statusStr)}`}>
                          {statusStr}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right pr-6 align-top">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => openEditModal(item)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirmId(item.sku)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-2xl">
          <span className="text-xs font-semibold text-slate-500">
            Page {currentPage} of {computedTotalPages}
          </span>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-600 transition-colors cursor-pointer select-none ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
            >
              Prev
            </button>

            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-slate-400 font-bold">...</span>
              ) : (
                <button
                  key={`page-${page}`}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-extrabold transition-all cursor-pointer border ${currentPage === page
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/10'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  {page}
                </button>
              )
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(computedTotalPages, p + 1))}
              disabled={currentPage === computedTotalPages}
              className={`px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-600 transition-colors cursor-pointer select-none ${currentPage === computedTotalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Add / Edit Inventory Item Portal Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-md w-full my-8 overflow-hidden transform transition-all duration-300">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 text-base">
                {modalType === 'add' ? 'Add New Stock Item' : 'Edit Stock Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Selection */}
                {modalType === 'add' && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Product *</label>
                    <select
                      required
                      value={itemForm.baseSku}
                      onChange={(e) => {
                        const prod = products.find(p => p.sku === e.target.value);
                        if (prod) {
                          setItemForm({
                            ...itemForm,
                            baseSku: prod.sku,
                            sku: prod.sku,
                            name: prod.name,
                            category: prod.category || 'Necklaces',
                            unitPrice: prod.retailPrice || 0,
                            variant: ''
                          });
                          if (prod.variants && prod.variants.length > 0) {
                            const initialVq = {};
                            prod.variants.forEach(vg => {
                              vg.options.forEach(opt => {
                                initialVq[`${vg.group}: ${opt}`] = '';
                              });
                            });
                            setVariantQuantities(initialVq);
                          } else {
                            setVariantQuantities({});
                          }
                        }
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="">-- Choose a Product --</option>
                      {products.map(p => (
                        <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Variant & Quantity Bulk Selection */}
                {modalType === 'add' && itemForm.baseSku && (() => {
                  const prod = products.find(p => p.sku === itemForm.baseSku);
                  if (prod && prod.variants && prod.variants.length > 0) {
                    return (
                      <div className="space-y-3 sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Set Quantities for Variants</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {prod.variants.map((vGroup) => (
                            vGroup.options.map((opt) => {
                              const variantName = `${vGroup.group}: ${opt}`;
                              return (
                                <div key={variantName} className="flex items-center justify-between bg-white px-3 py-2 border border-slate-200 rounded-lg shadow-sm">
                                  <span className="text-xs font-bold text-slate-700">{variantName}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="Qty"
                                    value={variantQuantities[variantName] !== undefined ? variantQuantities[variantName] : ''}
                                    onKeyDown={preventInvalidNumberInput}
                                    onChange={(e) => setVariantQuantities({ ...variantQuantities, [variantName]: e.target.value })}
                                    className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-center focus:outline-none focus:border-emerald-500"
                                  />
                                </div>
                              );
                            })
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Single Item Details (Hidden if using bulk variants) */}
                {!(modalType === 'add' && Object.keys(variantQuantities).length > 0) && (
                  <>
                    {/* Variant Selection (For Editing) */}
                    {modalType === 'edit' && (() => {
                      const prod = products.find(p => p.sku === itemForm.baseSku) || products.find(p => p.sku === itemForm.sku);
                      if (!prod || !prod.variants || prod.variants.length === 0) return null;
                      return (
                        <div className="space-y-1.5 sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Variant *</label>
                          <select
                            required
                            value={itemForm.variant}
                            onChange={(e) => {
                               const v = e.target.value;
                               const cleanV = v.replace(/[^a-zA-Z0-9]/g, '');
                               setItemForm({ ...itemForm, variant: v, sku: `${itemForm.baseSku || itemForm.sku}-${cleanV}` });
                            }}
                            className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Choose a Variant --</option>
                            {prod.variants.map((vGroup) => (
                               vGroup.options.map((opt) => (
                                 <option key={`${vGroup.group}-${opt}`} value={`${vGroup.group}: ${opt}`}>{vGroup.group}: {opt}</option>
                               ))
                            ))}
                          </select>
                        </div>
                      );
                    })()}

                    {/* SKU Code */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inventory SKU *</label>
                      <input
                        type="text"
                        required
                        disabled={modalType === 'edit'}
                        value={itemForm.sku}
                        onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                        placeholder="e.g. SKU-1007"
                        className={`w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all ${modalType === 'edit' ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''
                          }`}
                      />
                    </div>
                  </>
                )}

                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g. Diamond Studs"
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category *</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="Necklaces">Necklaces</option>
                    <option value="Bangles">Bangles</option>
                    <option value="Earrings">Earrings</option>
                    <option value="Rings">Rings</option>
                  </select>
                </div>

                {/* Warehouse Location */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Warehouse Location *</label>
                  <select
                    value={itemForm.warehouse}
                    onChange={(e) => setItemForm({ ...itemForm, warehouse: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="Main WH - A1">Main WH - A1</option>
                    <option value="Main WH - B2">Main WH - B2</option>
                    <option value="Retail Store">Retail Store</option>
                  </select>
                </div>

                {/* Single Quantity (Hidden if bulk) */}
                {!(modalType === 'add' && Object.keys(variantQuantities).length > 0) && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quantity *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={itemForm.quantity === 0 ? '' : itemForm.quantity}
                      onKeyDown={preventInvalidNumberInput}
                      onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                      placeholder="0"
                      className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                    />
                  </div>
                )}

                {/* Unit Price */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unit Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={itemForm.unitPrice === 0 ? '' : itemForm.unitPrice}
                    onKeyDown={preventInvalidNumberInput}
                    onChange={(e) => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Status *</label>
                  <select
                    value={itemForm.status}
                    onChange={(e) => setItemForm({ ...itemForm, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="In Stock">In Stock (Qty &gt; 15)</option>
                    <option value="Low Stock">Low Stock (Qty &lt;= 15)</option>
                    <option value="Out of Stock">Out of Stock (Qty = 0)</option>
                    <option value="Dead Stock">Dead Stock (Static No Movement)</option>
                  </select>
                </div>
              </div>

              {/* Total Computed Value row */}
              <div className="pt-1.5">
                <span className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wide">Dynamic Valuation: </span>
                <span className="text-sm font-black text-emerald-700 ml-1">
                  ₹{((parseInt(itemForm.quantity) || 0) * (parseFloat(itemForm.unitPrice) || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end items-center space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-emerald-500/15"
                >
                  {modalType === 'add' ? 'Add Item' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Portal Dialog */}
      {deleteConfirmId && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-extrabold text-slate-800 text-base">
                {(deleteConfirmId.startsWith('group-') || deleteConfirmId.startsWith('name:')) ? 'Delete All Variants' : 'Delete Stock Entry'}
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              {(deleteConfirmId.startsWith('group-') || deleteConfirmId.startsWith('name:'))
                ? 'This will permanently delete ALL variant entries for this product from inventory. This action cannot be undone.'
                : 'Are you sure you want to delete this stock entry? This will permanently erase SKU details, count records, and valuation data.'}
            </p>

            <div className="flex justify-end items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-6 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(deleteConfirmId)}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-rose-500/15"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Valuation Report Portal Modal */}
      {isValuationOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-emerald-600">
                <BarChart3 className="w-5 h-5" />
                <h3 className="font-extrabold text-slate-800 text-base">Warehouse Valuation Analysis</h3>
              </div>
              <button
                onClick={() => setIsValuationOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Valuation Table */}
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                Summary valuation metrics grouped by warehouse facilities. Calculations reflect current stock counts multiplied by unit prices.
              </p>

              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-inner bg-slate-50/50">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-250/30 text-slate-450 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Warehouse</th>
                      <th className="py-3 px-4 text-center">SKU Groups</th>
                      <th className="py-3 px-4 text-right">Items Count</th>
                      <th className="py-3 px-4 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {uniqueWarehouses.filter(w => w !== 'All').map(wh => {
                      const whItems = inventory.filter(i => i.warehouse === wh);
                      const skusCount = whItems.length;
                      const itemsCount = whItems.reduce((s, i) => s + i.quantity, 0);
                      const totalVal = whItems.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);

                      return (
                        <tr key={wh} className="hover:bg-white/40 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{wh}</td>
                          <td className="py-3 px-4 text-center text-slate-500">{skusCount}</td>
                          <td className="py-3 px-4 text-right text-slate-900">{itemsCount}</td>
                          <td className="py-3 px-4 text-right text-emerald-700 font-extrabold">₹{totalVal.toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-100/40 font-bold border-t border-slate-200">
                      <td className="py-3 px-4 text-slate-800">Grand Total</td>
                      <td className="py-3 px-4 text-center text-slate-500">{inventory.length}</td>
                      <td className="py-3 px-4 text-right text-slate-900">{totalItemsInStock}</td>
                      <td className="py-3 px-4 text-right text-emerald-800 font-black">₹{totalInventoryValue.toLocaleString('en-IN')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsValuationOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Inventory;
