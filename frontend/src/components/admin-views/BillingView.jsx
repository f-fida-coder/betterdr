import React, { useEffect, useState } from 'react';
import { createBillingInvoice, getBillingInvoices, getBillingSummary, updateBillingInvoice } from '../../api';

function BillingView() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({ paid: 0, outstanding: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ invoiceNumber: '', amount: '', status: 'pending', dueDate: '', notes: '' });

  const loadBilling = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to view billing.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [summaryData, invoicesData] = await Promise.all([
        getBillingSummary(token),
        getBillingInvoices({ status: statusFilter, limit: 200 }, token)
      ]);
      setSummary(summaryData || { paid: 0, outstanding: 0, total: 0 });
      setInvoices(invoicesData.invoices || []);
      setError('');
    } catch (err) {
      console.error('Failed to load billing:', err);
      setError(err.message || 'Failed to load billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBilling();
  }, [statusFilter]);

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '—';
    const num = Number(amount);
    if (Number.isNaN(num)) return '—';
    return `$${num.toFixed(2)}`;
  };

  const openCreateModal = () => {
    setForm({ invoiceNumber: '', amount: '', status: 'pending', dueDate: '', notes: '' });
    setShowFormModal(true);
  };

  const openViewModal = (invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to save invoices.');
      return;
    }
    try {
      setActionLoadingId('new');
      await createBillingInvoice({
        invoiceNumber: form.invoiceNumber.trim(),
        amount: Number(form.amount) || 0,
        status: form.status,
        dueDate: form.dueDate || null,
        notes: form.notes.trim() || null
      }, token);
      setShowFormModal(false);
      loadBilling();
    } catch (err) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkPaid = async (invoice) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login to update invoices.');
      return;
    }
    try {
      setActionLoadingId(invoice.id);
      await updateBillingInvoice(invoice.id, { status: 'paid' }, token);
      loadBilling();
    } catch (err) {
      setError(err.message || 'Failed to update invoice');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownload = (invoice) => {
    const content = JSON.stringify(invoice, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoice.invoice || 'invoice'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-view">
      <div className="view-header">
        <h2>Billing Management</h2>
        <button className="btn-primary" onClick={openCreateModal}>Create Invoice</button>
      </div>
      <div className="view-content">
        {loading && <div style={{ padding: '20px', textAlign: 'center' }}>Loading billing...</div>}
        {error && <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>}
        {!loading && !error && (
        <>
        <div className="billing-summary">
          <div className="summary-card">
            <h3>Total Paid</h3>
            <p className="amount">{formatAmount(summary.paid)}</p>
          </div>
          <div className="summary-card">
            <h3>Total Outstanding</h3>
            <p className="amount">{formatAmount(summary.outstanding)}</p>
          </div>
          <div className="summary-card">
            <h3>Total All Time</h3>
            <p className="amount">{formatAmount(summary.total)}</p>
          </div>
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <h3>Recent Invoices</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice}</td>
                  <td>{invoice.date ? new Date(invoice.date).toLocaleDateString() : '—'}</td>
                  <td>{formatAmount(invoice.amount)}</td>
                  <td><span className={`badge ${invoice.status}`}>{invoice.status}</span></td>
                  <td>
                    <button className="btn-small" onClick={() => handleDownload(invoice)}>Download</button>
                    <button className="btn-small" onClick={() => openViewModal(invoice)}>View</button>
                    {invoice.status !== 'paid' && (
                      <button
                        className="btn-small"
                        onClick={() => handleMarkPaid(invoice)}
                        disabled={actionLoadingId === invoice.id}
                      >
                        {actionLoadingId === invoice.id ? 'Working...' : 'Mark Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
        )}
      </div>

      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Invoice</h3>
            <div className="view-details">
              <div className="filter-group">
                <label>Invoice #</label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Amount</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div className="filter-group">
                <label>Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={actionLoadingId || !form.invoiceNumber.trim() || !form.amount}
              >
                {actionLoadingId ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Invoice Details</h3>
            <div className="view-details">
              <p><strong>Invoice:</strong> {selectedInvoice.invoice}</p>
              <p><strong>Amount:</strong> {formatAmount(selectedInvoice.amount)}</p>
              <p><strong>Status:</strong> {selectedInvoice.status}</p>
              <p><strong>Date:</strong> {selectedInvoice.date ? new Date(selectedInvoice.date).toLocaleString() : '—'}</p>
              <p><strong>Due Date:</strong> {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : '—'}</p>
              {selectedInvoice.notes && <p><strong>Notes:</strong> {selectedInvoice.notes}</p>}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillingView;
