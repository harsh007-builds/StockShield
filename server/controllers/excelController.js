const ExcelJS = require('exceljs');
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { checkProcurementTrigger } = require('./componentController');

const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || ext === '.xlsm') cb(null, true);
    else cb(new Error('Only .xlsx, .xls, and .xlsm files are allowed.'));
  },
});

exports.upload = upload;

exports.importInventory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return res.status(400).json({ error: 'No worksheet found in the file.' });
    }

    const results = { created: 0, updated: 0, errors: [] };

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const componentName = row.getCell(1).value?.toString()?.trim();
      const partNumber = row.getCell(2).value?.toString()?.trim();
      const currentStock = parseInt(row.getCell(3).value) || 0;
      const monthlyRequired = parseInt(row.getCell(4).value) || 0;

      if (!componentName || !partNumber) {
        results.errors.push(`Row ${i}: Missing component_name or part_number.`);
        continue;
      }

      if (currentStock < 0) {
        results.errors.push(`Row ${i}: Stock cannot be negative.`);
        continue;
      }

      try {
        const existing = await pool.query(
          'SELECT id FROM components WHERE part_number = $1',
          [partNumber]
        );

        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE components SET component_name = $1, current_stock = $2,
             monthly_required_quantity = $3, updated_at = NOW() WHERE part_number = $4`,
            [componentName, currentStock, monthlyRequired, partNumber]
          );
          results.updated++;
          await checkProcurementTrigger(existing.rows[0].id);
        } else {
          const inserted = await pool.query(
            `INSERT INTO components (component_name, part_number, current_stock, monthly_required_quantity)
             VALUES ($1, $2, $3, $4) RETURNING id`,
            [componentName, partNumber, currentStock, monthlyRequired]
          );
          results.created++;
          await checkProcurementTrigger(inserted.rows[0].id);
        }
      } catch (err) {
        results.errors.push(`Row ${i}: ${err.message}`);
      }
    }

    res.json({ message: 'Import completed.', results });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: `Error processing file: ${err.message}` });
  }
};

exports.exportInventory = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT component_name, part_number, current_stock, monthly_required_quantity,
              CEIL(monthly_required_quantity * 0.2) as reorder_threshold,
              CASE WHEN current_stock < CEIL(monthly_required_quantity * 0.2) THEN 'LOW' ELSE 'OK' END as status
       FROM components ORDER BY component_name`
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'StockShield';
    const ws = workbook.addWorksheet('Inventory');

    ws.columns = [
      { header: 'Component Name', key: 'component_name', width: 30 },
      { header: 'Part Number', key: 'part_number', width: 20 },
      { header: 'Current Stock', key: 'current_stock', width: 15 },
      { header: 'Monthly Required', key: 'monthly_required_quantity', width: 18 },
      { header: 'Reorder Threshold (20%)', key: 'reorder_threshold', width: 22 },
      { header: 'Status', key: 'status', width: 10 },
    ];

    // Style header
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    result.rows.forEach((row) => {
      const r = ws.addRow(row);
      if (row.status === 'LOW') {
        r.getCell(6).font = { bold: true, color: { argb: 'FFFF0000' } };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export inventory error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

exports.exportConsumption = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.component_name, c.part_number, ch.quantity_consumed,
              ch.stock_before, ch.stock_after, ch.created_at,
              p.pcb_name, pe.quantity_produced
       FROM consumption_history ch
       JOIN components c ON c.id = ch.component_id
       JOIN production_entries pe ON pe.id = ch.production_entry_id
       JOIN pcbs p ON p.id = pe.pcb_id
       ORDER BY ch.created_at DESC`
    );

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Consumption Report');

    ws.columns = [
      { header: 'Date', key: 'created_at', width: 20 },
      { header: 'PCB Name', key: 'pcb_name', width: 25 },
      { header: 'Qty Produced', key: 'quantity_produced', width: 15 },
      { header: 'Component', key: 'component_name', width: 30 },
      { header: 'Part Number', key: 'part_number', width: 20 },
      { header: 'Qty Consumed', key: 'quantity_consumed', width: 15 },
      { header: 'Stock Before', key: 'stock_before', width: 15 },
      { header: 'Stock After', key: 'stock_after', width: 15 },
    ];

    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    result.rows.forEach((row) => ws.addRow(row));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=consumption_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Export consumption error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};
