const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Database config (defaults)
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '9352785297',
  database: 'hydrant_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

(async () => {
  try {
    const pool = await mysql.createPool(DB_CONFIG);

    async function logHistory(pool, data) {
    const {
    hydrant_id,
    field_name,
    old_value,
    new_value,
    action_type,
    changed_by
  } = data;

  await pool.query(
    `INSERT INTO hydrant_history
     (hydrant_id, field_name, old_value, new_value, action_type, changed_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [hydrant_id, field_name, old_value, new_value, action_type, changed_by]
  );
}

    // create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hydrants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hydrant VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        inspection_date DATE,
        defects VARCHAR(255),
        checked_by VARCHAR(255)
      )
    `);

    // READ
    app.get('/api/hydrants', async (req, res) => {
      try {
        const [rows] = await pool.query('SELECT * FROM hydrants ORDER BY id DESC');
        res.json(rows);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    
    app.get('/api/hydrants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM hydrants WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Hydrant not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

    // CREATE
    app.post('/api/hydrants', async (req, res) => {
      try {
        const { hydrant, location, inspection_date, defects, checked_by } = req.body;
        const [result] = await pool.query(
          'INSERT INTO hydrants (hydrant, location, inspection_date, defects, checked_by) VALUES (?, ?, ?, ?, ?)',
          [hydrant, location, inspection_date || null, defects || null, checked_by || null]
        );
        res.json({ id: result.insertId, hydrant, location, inspection_date, defects, checked_by });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // UPDATE
    app.put('/api/hydrants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hydrant, location, inspection_date, defects, checked_by } = req.body;

    // 1️⃣ Get old record
    const [oldRows] = await pool.query(
      'SELECT * FROM hydrants WHERE id = ?', [id]
    );

    if (oldRows.length === 0) {
      return res.status(404).json({ error: 'Hydrant not found' });
    }

    const oldData = oldRows[0];

    // 2️⃣ Update record
    await pool.query(
      'UPDATE hydrants SET hydrant=?, location=?, inspection_date=?, defects=?, checked_by=? WHERE id=?',
      [hydrant, location, inspection_date || null, defects || null, checked_by || null, id]
    );

    const newData = {
      hydrant,
      location,
      inspection_date,
      defects,
      checked_by
    };

    // 3️⃣ Log history
    await logHistory(pool, {
      hydrant_id: id,
      field_name: 'MULTIPLE_FIELDS',
      old_value: JSON.stringify(oldData),
      new_value: JSON.stringify(newData),
      action_type: 'UPDATE',
      changed_by: checked_by,
      before_snapshot: JSON.stringify(oldData),
      after_snapshot: JSON.stringify(newData)
    });

    res.json({ id, ...newData });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



    // DELETE
    app.delete('/api/hydrants/:id', async (req, res) => {
      try {
        const { id } = req.params;
        await pool.query('DELETE FROM hydrants WHERE id = ?', [id]);
        res.json({ message: 'Hydrant deleted', id });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    
    app.get('/api/hydrants/history/summary', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        DATE(changed_by) AS date,
        COUNT(*) AS total_changes
      FROM hydrant_history
      GROUP BY DATE(changed_at)
      ORDER BY date ASC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('Error setting up database or server:', err);
    process.exit(1);
  }
})();
