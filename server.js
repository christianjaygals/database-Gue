// server.js - CLEAN & PERFECT
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ------------------- DASHBOARD -------------------
app.get("/api/dashboard", async (req, res) => {
    const queries = {
        patients: "SELECT COUNT(*) AS total FROM patient",
        doctors: "SELECT COUNT(*) AS total FROM local_doctor",
        wards: "SELECT COUNT(*) AS total FROM ward",
        beds: "SELECT COUNT(*) AS total FROM bed",
        staff: "SELECT COUNT(*) AS total FROM ward_staff"
    };

    try {
        const [patientResult, doctorResult, wardResult, bedResult, staffResult] = await Promise.all([
            new Promise((resolve, reject) => db.query(queries.patients, (err, result) => err ? reject(err) : resolve(result))),
            new Promise((resolve, reject) => db.query(queries.doctors, (err, result) => err ? reject(err) : resolve(result))),
            new Promise((resolve, reject) => db.query(queries.wards, (err, result) => err ? reject(err) : resolve(result))),
            new Promise((resolve, reject) => db.query(queries.beds, (err, result) => err ? reject(err) : resolve(result))),
            new Promise((resolve, reject) => db.query(queries.staff, (err, result) => err ? reject(err) : resolve(result)))
        ]);

        res.json({
            patients: patientResult[0].total,
            doctors: doctorResult[0].total,
            wards: wardResult[0].total,
            beds: bedResult[0].total,
            staff: staffResult[0].total
        });
    } catch (err) {
        res.status(500).json(err);
    }
});

// ------------------- GET PATIENTS LIST (GLOBAL SEARCH) -------------------
app.get("/api/patients", (req, res) => {
    const search = req.query.search || "";
    
    if (search) {
        const sql = `
            SELECT p.*, d.full_name AS doctor_name
            FROM patient p
            LEFT JOIN local_doctor d ON p.doctor_id = d.doctor_id
            WHERE p.first_name LIKE ? OR p.last_name LIKE ? OR p.phone LIKE ?
               OR p.address LIKE ? OR d.full_name LIKE ? OR p.sex LIKE ?
               OR p.marital_status LIKE ?
            ORDER BY p.patient_id ASC
        `;
        const value = `%${search}%`;
        db.query(sql, [value, value, value, value, value, value, value], (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        });
    } else {
        const sql = `
            SELECT p.*, d.full_name AS doctor_name
            FROM patient p
            LEFT JOIN local_doctor d ON p.doctor_id = d.doctor_id
            ORDER BY p.patient_id ASC
        `;
        db.query(sql, (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        });
    }
});

// ------------------- GET SINGLE PATIENT (View/Edit) -------------------
app.get("/api/patients/:id", (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT p.*, d.full_name AS doctor_name, d.clinic_name
        FROM patient p
        LEFT JOIN local_doctor d ON p.doctor_id = d.doctor_id
        WHERE p.patient_id = ?
    `;
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json(err);
        if (results.length === 0) return res.status(404).json({ error: "Patient not found" });
        res.json(results[0]);
    });
});

// ------------------- UPDATE PATIENT -------------------
app.put("/api/patients/:id", (req, res) => {
    const id = req.params.id;
    const { first_name, last_name, address, phone, dob, sex, marital_status, doctor_id } = req.body;

    const sql = `
        UPDATE patient 
        SET first_name = ?, last_name = ?, address = ?, phone = ?, dob = ?, 
            sex = ?, marital_status = ?, doctor_id = ?
        WHERE patient_id = ?
    `;
    db.query(sql, [first_name, last_name, address, phone, dob, sex, marital_status, doctor_id || null, id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Patient updated successfully" });
    });
});

// ------------------- ADD PATIENT -------------------
app.post("/api/patients", (req, res) => {
    const { first_name, last_name, address, phone, dob, sex, marital_status, doctor_id } = req.body;

    const sql = `
        INSERT INTO patient
        (first_name, last_name, address, phone, dob, sex, marital_status, date_registered, doctor_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
    `;
    db.query(sql, [first_name, last_name, address, phone, dob, sex, marital_status, doctor_id || null], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Patient added successfully" });
    });
});

// ------------------- DELETE PATIENT -------------------
app.delete("/api/patients/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM patient WHERE patient_id = ?", [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Patient deleted successfully" });
    });
});

app.get("/api/beds", (req, res) => {
    const search = req.query.search || "";
    const sql = `
        SELECT 
            b.bed_id, b.bed_number, w.ward_id, b.patient_id,
            w.ward_name,
            CONCAT(p.first_name, ' ', p.last_name) as patient_name
        FROM bed b
        JOIN ward w ON b.ward_id = w.ward_id
        LEFT JOIN patient p ON b.patient_id = p.patient_id
        WHERE b.bed_number LIKE ? OR w.ward_name LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?
        ORDER BY w.ward_id, b.bed_number
    `;
    const value = `%${search}%`;
    db.query(sql, [value, value, value, value], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post("/api/beds/:id/assign", (req, res) => {
    const bed_id = req.params.id;
    const { patient_id } = req.body;
    
    db.query('UPDATE bed SET patient_id = ? WHERE bed_id = ?', [patient_id, bed_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});
// ------------------- GET BEDS (GLOBAL SEARCH) -------------------
app.get("/api/beds", (req, res) => {
    const search = req.query.search || "";
    const sql = `
        SELECT 
            b.bed_id, b.bed_number, w.ward_id, b.patient_id,
            w.ward_name,
            CONCAT(p.first_name, ' ', p.last_name) as patient_name
        FROM bed b
        JOIN ward w ON b.ward_id = w.ward_id
        LEFT JOIN patient p ON b.patient_id = p.patient_id
        WHERE b.bed_number LIKE ? OR w.ward_name LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ?
        ORDER BY w.ward_id, b.bed_number
    `;
    const value = `%${search}%`;
    db.query(sql, [value, value, value, value], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post("/api/beds/:id/assign", (req, res) => {
    const bed_id = req.params.id;
    const { patient_id } = req.body;
    
    db.query('UPDATE bed SET patient_id = ? WHERE bed_id = ?', [patient_id, bed_id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Add this route (before app.listen)
app.post('/api/beds/:id/discharge', function(req, res) {
    const bed_id = req.params.id;
    console.log("🛏️ DISCHARGE BED:", bed_id);
    
    db.query('UPDATE bed SET patient_id = NULL WHERE bed_id = ?', [bed_id], function(err, result) {
        if (err) {
            console.error("❌ SQL ERROR:", err);
            return res.status(500).send("Database error");
        }
        console.log("✅ DISCHARGED! Rows:", result.affectedRows);
        res.json({ success: true });
    });
});

// ------------------- GET DOCTORS (WITH SEARCH) -------------------
app.get("/api/doctors", (req, res) => {
    const search = req.query.search || "";
    
    if (search) {
        const sql = `
            SELECT doctor_id, full_name, phone, address, clinic_name 
            FROM local_doctor 
            WHERE full_name LIKE ? OR phone LIKE ? OR clinic_name LIKE ? OR address LIKE ?
            ORDER BY full_name ASC
        `;
        const value = `%${search}%`;
        db.query(sql, [value, value, value, value], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    } else {
        db.query("SELECT doctor_id, full_name, phone, address, clinic_name FROM local_doctor ORDER BY full_name ASC", (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    }
});

// ------------------- GET SINGLE DOCTOR (View/Edit) -------------------
app.get("/api/doctors/:id", (req, res) => {
    const id = req.params.id;
    const sql = `
        SELECT doctor_id, full_name, phone, address, clinic_name 
        FROM local_doctor 
        WHERE doctor_id = ?
    `;
    db.query(sql, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Doctor not found" });
        res.json(results[0]);
    });
});

// ------------------- UPDATE DOCTOR -------------------
app.put("/api/doctors/:id", (req, res) => {
    const id = req.params.id;
    const { full_name, phone, clinic_name, address } = req.body;
    
    console.log('🔍 Updating doctor:', { id, full_name, phone, clinic_name, address });
    
    const sql = `
        UPDATE local_doctor 
        SET full_name = ?, phone = ?, clinic_name = ?, address = ?
        WHERE doctor_id = ?
    `;
    // ❌ WRONG: clinic_name and address are swapped!
    // db.query(sql, [full_name || null, phone || null, clinic_name || null, address || null, id], (err, result) => {
    
    // ✅ FIXED: Correct order - matches column order EXACTLY
    db.query(sql, [full_name || null, phone || null, clinic_name || null, address || null, id], (err, result) => {
        console.log('🔍 Update result:', result.affectedRows);
        
        if (err) {
            console.error('🚨 SQL ERROR:', err);
            return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Doctor not found' });
        }
        res.json({ message: "Doctor updated successfully" });
    });
});

// ------------------- ADD DOCTOR -------------------
app.post("/api/doctors", (req, res) => {
    const { full_name, phone, clinic_name, address } = req.body;
    
    console.log('🧪 Adding doctor:', { full_name, phone, address, clinic_name }); // 🧪 DEBUG
    
    const sql = `
        INSERT INTO local_doctor (full_name, phone, address, clinic_name)
        VALUES (?, ?, ?, ?)
    `;
    // ✅ CORRECT: Matches column order perfectly
    db.query(sql, [full_name, phone || null, address || null, clinic_name], (err, result) => {
        console.log('🧪 Insert result:', result); // 🧪 DEBUG
        
        if (err) {
            console.error('🚨 INSERT ERROR:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "Doctor added successfully", insertId: result.insertId });
    });
});

// ------------------- DELETE DOCTOR -------------------
app.delete("/api/doctors/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM local_doctor WHERE doctor_id = ?", [id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Doctor deleted successfully" });
    });
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
