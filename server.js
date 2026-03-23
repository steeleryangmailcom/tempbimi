const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const https = require('https');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: make HTTPS request to Blueshift API
function blueshiftRequest(apiKey, urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.getblueshift.com',
      path: urlPath,
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64'),
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response: ' + data.substring(0, 200)));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 300)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timed out'));
    });
    req.end();
  });
}

// Compare a flat CSV row against a nested customer JSON object
function compareFields(csvRow, customerData) {
  const results = [];

  for (const [csvKey, csvValue] of Object.entries(csvRow)) {
    if (csvKey.toLowerCase() === 'email') continue; // used as lookup key, skip

    // Try to find the value in customer JSON (top-level or inside nested objects)
    const apiValue = findValue(customerData, csvKey);

    const csvNorm = normalizeValue(csvValue);
    const apiNorm = normalizeValue(apiValue);
    const match = csvNorm === apiNorm;

    results.push({
      field: csvKey,
      csvValue: csvValue === '' || csvValue === null || csvValue === undefined ? '(empty)' : csvValue,
      apiValue: apiValue === undefined ? '(not found)' : (apiValue === null || apiValue === '' ? '(empty)' : String(apiValue)),
      match,
    });
  }

  return results;
}

// Recursively search for a key in a nested object (case-insensitive)
function findValue(obj, key, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) return undefined;

  const lowerKey = key.toLowerCase();

  for (const [k, v] of Object.entries(obj)) {
    if (k.toLowerCase() === lowerKey) return v;
  }

  // Check nested objects (but not arrays of objects to keep it predictable)
  for (const [, v] of Object.entries(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const found = findValue(v, key, depth + 1);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

function normalizeValue(val) {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val).trim();
  // Normalize booleans
  if (str.toLowerCase() === 'true') return 'true';
  if (str.toLowerCase() === 'false') return 'false';
  return str;
}

// POST /api/test — accepts CSV + API key, returns comparison results
app.post('/api/test', upload.single('csv'), async (req, res) => {
  const apiKey = req.body.apiKey;
  if (!apiKey) return res.status(400).json({ error: 'API key is required' });
  if (!req.file) return res.status(400).json({ error: 'CSV file is required' });

  let rows;
  try {
    rows = parse(req.file.buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (e) {
    return res.status(400).json({ error: 'Failed to parse CSV: ' + e.message });
  }

  if (rows.length === 0) return res.status(400).json({ error: 'CSV file is empty' });

  // Detect email column (case-insensitive)
  const headers = Object.keys(rows[0]);
  const emailCol = headers.find(h => h.toLowerCase() === 'email');
  if (!emailCol) return res.status(400).json({ error: 'CSV must contain an "email" column' });

  const results = [];

  for (const row of rows) {
    const email = row[emailCol];
    if (!email) {
      results.push({ email: '(missing)', error: 'No email in row', fields: [] });
      continue;
    }

    try {
      // Step 1: Search for customer by email
      const searchResult = await blueshiftRequest(
        apiKey,
        '/api/v1/customers?email=' + encodeURIComponent(email)
      );

      // Blueshift returns { customers: [...] } or directly an array
      const customers = searchResult.customers || (Array.isArray(searchResult) ? searchResult : null);
      if (!customers || customers.length === 0) {
        results.push({ email, error: 'Customer not found in Blueshift', fields: [] });
        continue;
      }

      const uuid = customers[0].uuid || customers[0].id;
      if (!uuid) {
        results.push({ email, error: 'No UUID returned for customer', fields: [] });
        continue;
      }

      // Step 2: Get full customer details by UUID
      const customerData = await blueshiftRequest(apiKey, '/api/v1/customers/' + uuid);

      // Step 3: Compare fields
      const fields = compareFields(row, customerData);
      const matchCount = fields.filter(f => f.match).length;
      results.push({ email, uuid, fields, matchCount, totalFields: fields.length });

    } catch (err) {
      results.push({ email, error: err.message, fields: [] });
    }
  }

  res.json({ results, totalRows: rows.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Blueshift Customer Tester running at http://localhost:${PORT}`);
});
