import React, { useState } from 'react';
import api from '../api';

export default function ExcelIO() {
  const [file, setFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setImportResult(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/excel/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data.results);
      setFile(null);
      // reset file input
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const url = type === 'inventory' ? '/excel/export/inventory' : '/excel/export/consumption';
      const res = await api.get(url, { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = type === 'inventory' ? 'inventory_export.xlsx' : 'consumption_report.xlsx';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      alert('Export failed.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Excel Import / Export</h1>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Import Inventory from Excel</h3>
        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>
          Upload an .xlsx file with columns: <strong>Component Name</strong>, <strong>Part Number</strong>, <strong>Current Stock</strong>, <strong>Monthly Required Quantity</strong>. 
          The first row should be the header. Existing components (matched by part number) will be updated.
        </p>
        {error && <div className="error-msg">{error}</div>}
        {importResult && (
          <div className="success-msg" style={{ marginBottom: 16 }}>
            Import complete: {importResult.created} created, {importResult.updated} updated.
            {importResult.errors.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
        <form onSubmit={handleImport} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} required />
          <button className="btn btn-primary" type="submit" disabled={uploading}>
            {uploading ? 'Importing...' : 'Import'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>Export Reports</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-success" onClick={() => handleExport('inventory')}>
            Export Inventory (.xlsx)
          </button>
          <button className="btn btn-primary" onClick={() => handleExport('consumption')}>
            Export Consumption Report (.xlsx)
          </button>
        </div>
      </div>
    </div>
  );
}
