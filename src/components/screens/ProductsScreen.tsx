import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  Tag,
  X,
  Milk,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';

export const ProductsScreen: React.FC = () => {
  const { products, saveProduct, deleteProduct, theme } = useApp();
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Product['category']>('MILK');
  const [unit, setUnit] = useState<Product['unit']>('pouch');
  const [pouchesPerCrate, setPouchesPerCrate] = useState('24');
  const [defaultRate, setDefaultRate] = useState('33');
  const [mrp, setMrp] = useState('34');

  const categories = ['ALL', 'MILK', 'CURD', 'BUTTERMILK', 'PANEER', 'GHEE', 'OTHER'];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && p.isActive !== false) ||
      (statusFilter === 'INACTIVE' && p.isActive === false);
    return matchesSearch && matchesCat && matchesStatus;
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setCode('');
    setName('');
    setCategory('MILK');
    setUnit('pouch');
    setPouchesPerCrate('24');
    setDefaultRate('30');
    setMrp('32');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setCategory(p.category);
    setUnit(p.unit);
    setPouchesPerCrate(String(p.pouchesPerCrate));
    setDefaultRate(String(p.defaultWholesaleRate));
    setMrp(String(p.mrp));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    const prod: Product = {
      id: editingProduct ? editingProduct.id : `prod_${code.toLowerCase()}_${Date.now()}`,
      code: code.trim().toUpperCase(),
      name: name.trim(),
      category,
      unit,
      pouchesPerCrate: parseInt(pouchesPerCrate, 10) || 24,
      defaultWholesaleRate: parseFloat(defaultRate) || 0,
      mrp: parseFloat(mrp) || 0,
      isActive: true,
    };

    await saveProduct(prod);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div
          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${
            isDark
              ? 'bg-[#101D36] border-blue-900/40 text-slate-200'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by SKU code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm font-medium outline-none"
          />
        </div>

        <button
          id="btn-add-product"
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 active:scale-95 transition-all shadow shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Categories & Active Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : isDark
                  ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-xl border border-slate-800 text-[11px] font-bold">
          {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className={`p-4 rounded-2xl border space-y-3 transition-all ${
              isDark
                ? 'bg-[#101D36] border-blue-900/40 text-slate-100 hover:border-amber-500/40'
                : 'bg-white border-slate-200 text-slate-800 shadow-sm hover:border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 font-black text-xs flex items-center justify-center">
                  {p.code}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{p.name}</h4>
                  <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {p.category}
                  </span>
                </div>
              </div>

              <button
                onClick={() => openEditModal(p)}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white"
                title="Edit Product"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pricing & Crate Specs */}
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Supply Rate</span>
                <p className="font-black text-amber-400">₹{p.defaultWholesaleRate.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">MRP</span>
                <p className="font-bold text-slate-300">₹{p.mrp.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase">In Crate</span>
                <p className="font-bold text-cyan-400">
                  {p.pouchesPerCrate} <span className="text-[10px]">{p.unit}s</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Product Add/Edit Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={`w-full max-w-md rounded-3xl border p-5 shadow-2xl ${
              isDark ? 'bg-[#0B1528] border-blue-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-amber-400">
                {editingProduct ? 'Edit Product SKU' : 'Add New Dairy Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl border border-slate-700 bg-slate-800 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 mt-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Code (Short) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="GD / TM"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-amber-400 font-bold uppercase outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Product Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Amul Gold 500ml"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Product['category'])}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  >
                    <option value="MILK">Milk</option>
                    <option value="CURD">Curd / Dahi</option>
                    <option value="PANEER">Paneer</option>
                    <option value="BEVERAGE">Chaas / Beverage</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Packing</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as Product['unit'])}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 outline-none font-bold"
                  >
                    <option value="pouch">Pouch</option>
                    <option value="packet">Packet</option>
                    <option value="liter">Liter</option>
                    <option value="kg">Kg</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Crate Capacity
                  </label>
                  <input
                    type="number"
                    value={pouchesPerCrate}
                    onChange={(e) => setPouchesPerCrate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-center text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Wholesale Rate
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-right text-amber-400 font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">MRP</label>
                  <input
                    type="number"
                    step="0.5"
                    value={mrp}
                    onChange={(e) => setMrp(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-right text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                {editingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = editingProduct;
                      setIsModalOpen(false);
                      setProductToDelete(p);
                    }}
                    className="text-rose-400 text-xs font-bold flex items-center gap-1 hover:text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Product
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400"
                  >
                    Save Product
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Delete Confirmation Modal */}
      {productToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setProductToDelete(null)}
        >
          <div
            className={`w-full max-w-sm rounded-3xl border p-5 shadow-2xl space-y-4 ${
              isDark ? 'bg-[#0B1528] border-rose-900/40 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-rose-400">Delete Product?</h3>
                <p className="text-xs text-slate-400">Are you sure you want to delete this product?</p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Product:</span>
                <span className="font-bold">{productToDelete.name} ({productToDelete.code})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Category:</span>
                <span className="font-semibold">{productToDelete.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unit / Rate:</span>
                <span className="font-bold text-amber-400">₹{productToDelete.defaultRate} / {productToDelete.unit}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              This product will be removed from your active catalog. Past entries and bills that used this product will keep their historical recorded rates safe.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = productToDelete.id;
                  setProductToDelete(null);
                  await deleteProduct(id);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 active:scale-95 transition-all shadow-sm"
              >
                Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
