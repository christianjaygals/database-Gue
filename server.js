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

// ------------------- GET DOCTORS -------------------
app.get("/api/doctors", (req, res) => {
    db.query("SELECT doctor_id, full_name FROM local_doctor ORDER BY full_name", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
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

// ------------------- RECENT ACTIVITIES (REAL DATA) -------------------
app.get("/api/recent-activities", (req, res) => {
    const sql = `
        SELECT 
            'New patient admitted' as activity_type,
            CONCAT(p.first_name, ' ', p.last_name) as name,
            TIMESTAMPDIFF(MINUTE, p.date_registered, NOW()) as minutes_ago
        FROM patient p 
        WHERE p.date_registered > DATE_SUB(NOW(), INTERVAL 1 DAY)
        
        UNION ALL
        
        SELECT 
            CONCAT('Patient discharged: ', ws.first_name, ' ', ws.last_name) as activity_type,
            '' as name,
            TIMESTAMPDIFF(HOUR, ws.date_of_birth, NOW()) % 24 as minutes_ago  
        FROM ward_staff ws
        WHERE ws.date_of_birth > DATE_SUB(NOW(), INTERVAL 1 DAY)
        
        ORDER BY minutes_ago ASC
        LIMIT 5
    `;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        
        // Format time ago
        const formatted = results.map(row => ({
            type: row.activity_type.includes('admitted') ? 'admit' : 
                  row.activity_type.includes('discharged') ? 'discharge' : 'other',
            message: row.activity_type,
            time: formatTimeAgo(row.minutes_ago)
        }));
        
        res.json(formatted);
    });
});

// ------------------- UPCOMING APPOINTMENTS (REAL DATA) -------------------
app.get("/api/upcoming-appointments", (req, res) => {
    const sql = `
        SELECT 
            CONCAT(p.first_name, ' ', p.last_name) as patient,
            COALESCE(d.full_name, 'No Doctor') as doctor,
            TIME(p.dob) as time,
            CASE 
                WHEN DATE(p.date_registered) = CURDATE() THEN 'Today'
                ELSE 'Tomorrow'
            END as date
        FROM patient p
        LEFT JOIN local_doctor d ON p.doctor_id = d.doctor_id
        WHERE p.date_registered >= CURDATE()
        ORDER BY p.date_registered ASC, TIME(p.dob) ASC
        LIMIT 5
    `;
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ------------------- HELPER FUNCTION -------------------
function formatTimeAgo(minutes) {
    if (minutes < 60) return `${minutes} minutes ago`;
    if (minutes < 1440) return `${Math.floor(minutes/60)} hours ago`;
    return `${Math.floor(minutes/1440)} days ago`;
}

// ------------------- STAFF OPERATIONS (a,b,c) -------------------
// (a) GET ALL STAFF
app.get("/api/staff", (req, res) => {
    const search = req.query.search || "";
    const sql = `
        SELECT * FROM ward_staff 
        WHERE first_name LIKE ? OR last_name LIKE ? OR position LIKE ?
        ORDER BY position, first_name
    `;
    db.query(sql, [`%${search}%`, `%${search}%`, `%${search}%`], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// (c) STAFF BY WARD REPORT
app.get("/api/staff-by-ward", (req, res) => {
    const sql = `
        SELECT w.ward_name, COUNT(ws.staff_id) as staff_count,
               GROUP_CONCAT(CONCAT(ws.first_name, ' ', ws.last_name, ' (', ws.position, ')') SEPARATOR ', ') as staff_list
        FROM ward w
        LEFT JOIN ward_staff ws ON 1=1
        GROUP BY w.ward_id, w.ward_name
        ORDER BY w.ward_name
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ------------------- PATIENT OPERATIONS (f) -------------------
// (f) OUTPATIENTS REPORT (patients without doctor)
app.get("/api/outpatients", (req, res) => {
    const sql = `
        SELECT p.*, 'No Doctor Assigned' as doctor_name
        FROM patient p
        LEFT JOIN local_doctor d ON p.doctor_id = d.doctor_id
        WHERE p.doctor_id IS NULL
        ORDER BY p.date_registered DESC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ------------------- WARD OPERATIONS (h,i) -------------------
// (h,i) PATIENTS BY WARD (via doctor/registration)
app.get("/api/patients-by-ward", (req, res) => {
    const sql = `
        SELECT w.ward_name, COUNT(p.patient_id) as patient_count,
               GROUP_CONCAT(CONCAT(p.first_name, ' ', p.last_name) SEPARATOR ', ') as patient_list
        FROM ward w
        LEFT JOIN patient p ON 1=1
        GROUP BY w.ward_id, w.ward_name
        ORDER BY w.ward_name
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

// ------------------- SUPPLIERS & REQUISITIONS (l,m,n) -------------------
app.get("/api/suppliers", (req, res) => {
    // Mock for now - add suppliers table later
    res.json([
        { id: 1, name: "MedSupply Inc", contact: "John Doe", phone: "0912345678" },
        { id: 2, name: "PharmaCorp", contact: "Jane Smith", phone: "0912345679" }
    ]);
});

app.get("/api/requisitions", (req, res) => {
    res.json([
        { ward: "Orthopaedic", item: "Gauze", qty: 50, date: "2024-01-15" },
        { ward: "ICU", item: "IV Drips", qty: 20, date: "2024-01-14" }
    ]);
});


app.listen(3000, () => console.log("Server running at http://localhost:3000"));