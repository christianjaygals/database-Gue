const API = "http://localhost:3000";


/* =========================
   LOAD DASHBOARD
========================= */
async function loadDashboard() {
    try {
        const res = await fetch(`${API}/api/dashboard`);
        const data = await res.json();

        document.getElementById("totalPatients").innerText = data.patients;
        document.getElementById("totalDoctors").innerText = data.doctors;
        document.getElementById("totalWards").innerText = data.wards;
        document.getElementById("totalBeds").innerText = data.beds;
        document.getElementById("totalStaff").innerText = data.staff;
    } catch (err) {
        console.error("Dashboard Error:", err);
    }
}

/* =========================
   POPULATE ALL DOCTOR DROPDOWNS (FIXED - ALL MODALS)
========================= */
async function loadAllDoctors() {
    try {
        const res = await fetch(`${API}/api/doctors`);
        const doctors = await res.json();
        
        // ✅ ALL DROPDOWNS - Add, Patient Edit, Patient Add
        const dropdowns = [
            "add_doctor_id",      // Add Patient modal
            "edit_doctor_id",     // Edit Patient modal  
            "edit_doctor_id"      // Doctor edit modal (same ID)
        ];
        
        dropdowns.forEach(dropdownId => {
            const select = document.getElementById(dropdownId);
            if (select) {
                select.innerHTML = '<option value="">Select Doctor</option>';
                doctors.forEach(doc => {
                    select.innerHTML += `<option value="${doc.doctor_id}">${doc.full_name}</option>`;
                });
            }
        });
        
        console.log(`✅ Loaded ${doctors.length} doctors into all dropdowns`);
    } catch (err) {
        console.error("Load Doctors Error:", err);
    }
}

/* =========================
   LOAD PATIENTS (GLOBAL SEARCH)
========================= */
async function loadPatients(search = "") {
    try {
        const res = await fetch(`${API}/api/patients?search=${encodeURIComponent(search)}`);
        const data = await res.json();
        console.log("Patients data:", data);

        const table = document.getElementById("patientTable");
        table.innerHTML = "";

        if (data.length === 0) {
            table.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No patients found matching "${search || 'any criteria'}"</td></tr>`;
            return;
        }

        data.forEach(p => {
            table.innerHTML += `
            <tr>
                <td>${p.patient_id}</td>
                <td>${p.first_name} ${p.last_name}</td>
                <td>${new Date(p.dob).toLocaleDateString()}</td>
                <td>${p.sex}</td>
                <td>${p.phone}</td>
                <td>${p.doctor_name || "N/A"}</td>
                <td class="actions">
                    <button class="view-btn" onclick="viewPatient(${p.patient_id})" title="View Details">👁️</button>
                    <button class="edit-btn" onclick="editPatient(${p.patient_id})" title="Edit">✏️</button>
                    <button class="delete-btn" onclick="deletePatient(${p.patient_id})" title="Delete">🗑️</button>
                </td>
            </tr>`;
        });
    } catch (err) {
        console.error("Load Patients Error:", err);
    }
}



/* =========================
   VIEW PATIENT
========================= */
async function viewPatient(id) {
    try {
        const res = await fetch(`${API}/api/patients/${id}`);
        const patient = await res.json();
        
        document.getElementById("viewTitle").textContent = `${patient.first_name} ${patient.last_name} - Details`;
        document.getElementById("viewContent").innerHTML = `
            <div class="patient-details">
                <p><strong>ID:</strong> ${patient.patient_id}</p>
                <p><strong>Name:</strong> ${patient.first_name} ${patient.last_name}</p>
                <p><strong>Date of Birth:</strong> ${new Date(patient.dob).toLocaleDateString()}</p>
                <p><strong>Gender:</strong> ${patient.sex}</p>
                <p><strong>Phone:</strong> ${patient.phone}</p>
                <p><strong>Address:</strong> ${patient.address || 'N/A'}</p>
                <p><strong>Marital Status:</strong> ${patient.marital_status || 'N/A'}</p>
                <p><strong>Date Registered:</strong> ${new Date(patient.date_registered).toLocaleDateString()}</p>
                <p><strong>Doctor:</strong> ${patient.doctor_name || 'N/A'}</p>
                ${patient.clinic_name ? `<p><strong>Clinic:</strong> ${patient.clinic_name}</p>` : ''}
            </div>
        `;
        document.getElementById("viewModal").style.display = "block";
    } catch (err) {
        console.error("View Patient Error:", err);
    }
}

/* =========================
   EDIT PATIENT (WITH DOCTOR DROPDOWN SAFETY)
========================= */
async function editPatient(id) {
    try {
        // ✅ PRELOAD DOCTORS FIRST
        await loadAllDoctors();
        
        const res = await fetch(`${API}/api/patients/${id}`);
        const patient = await res.json();
        
        // Populate edit form
        document.getElementById("edit_patient_id").value = patient.patient_id;
        document.getElementById("edit_first_name").value = patient.first_name;
        document.getElementById("edit_last_name").value = patient.last_name;
        document.getElementById("edit_address").value = patient.address || '';
        document.getElementById("edit_phone").value = patient.phone;
        document.getElementById("edit_dob").value = patient.dob;
        document.getElementById("edit_sex").value = patient.sex;
        document.getElementById("edit_marital_status").value = patient.marital_status || '';
        document.getElementById("edit_doctor_id").value = patient.doctor_id || '';
        
        // ✅ DEBUG - Check if dropdown populated
        console.log("🎯 Edit patient loaded:", patient.patient_id, "Doctor ID:", patient.doctor_id);
        
        document.getElementById("editModal").style.display = "block";
    } catch (err) {
        console.error("Edit Patient Error:", err);
        alert("Error loading patient data");
    }
}

/* =========================
   UPDATE PATIENT
========================= */
async function updatePatient() {
    const id = document.getElementById("edit_patient_id").value;
    const first_name = document.getElementById("edit_first_name").value;
    const last_name = document.getElementById("edit_last_name").value;
    const address = document.getElementById("edit_address").value;
    const phone = document.getElementById("edit_phone").value;
    const dob = document.getElementById("edit_dob").value;
    const sex = document.getElementById("edit_sex").value;
    const marital_status = document.getElementById("edit_marital_status").value;
    const doctor_id = document.getElementById("edit_doctor_id").value || null;

    if (!first_name || !last_name || !phone) {
        alert("Please fill required fields (Name, Phone)");
        return;
    }

    try {
        await fetch(`${API}/api/patients/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ first_name, last_name, address, phone, dob, sex, marital_status, doctor_id })
        });
        closeEditForm();
        loadPatients();
        loadDashboard();
    } catch (err) {
        console.error("Update Patient Error:", err);
    }
}

/* =========================
   SAVE NEW PATIENT (Fixed Form Clear)
========================= */
async function saveNewPatient() {
    const first_name = document.getElementById("add_first_name").value;
    const last_name = document.getElementById("add_last_name").value;
    const address = document.getElementById("add_address").value;
    const phone = document.getElementById("add_phone").value;
    const dob = document.getElementById("add_dob").value;
    const sex = document.getElementById("add_sex").value;
    const marital_status = document.getElementById("add_marital_status").value;
    const doctor_id = document.getElementById("add_doctor_id").value || null;

    if (!first_name || !last_name || !phone) {
        alert("Please fill required fields (Name, Phone)");
        return;
    }

    try {
        await fetch(`${API}/api/patients`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ first_name, last_name, address, phone, dob, sex, marital_status, doctor_id })
        });
        closeAddForm();
        loadPatients();
        loadDashboard();
        clearAddForm(); // Clear all fields
    } catch (err) {
        console.error("Save Patient Error:", err);
    }
}

function clearAddForm() {
    document.getElementById("add_first_name").value = '';
    document.getElementById("add_last_name").value = '';
    document.getElementById("add_address").value = '';
    document.getElementById("add_phone").value = '';
    document.getElementById("add_dob").value = '';
    document.getElementById("add_sex").value = '';
    document.getElementById("add_marital_status").value = '';
    document.getElementById("add_doctor_id").value = '';
}

/* =========================
   DELETE PATIENT
========================= */
async function deletePatient(id) {
    if (!confirm("Delete this patient?")) return;

    try {
        await fetch(`${API}/api/patients/${id}`, { method: "DELETE" });
        loadPatients();
        loadDashboard();
    } catch (err) {
        console.error("Delete Patient Error:", err);
    }
}

/* =========================
   NAVBAR SECTION SWITCHING (IMPROVED)
========================= */
function initNavbar() {
    const sections = document.querySelectorAll("section");
    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            const target = link.getAttribute("href").replace("#", "");
            
            // Hide all sections
            sections.forEach(sec => sec.style.display = "none");
            
            // Show target section
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.style.display = "block";
                
                // Load data for specific sections
                if (target === "dashboard") loadDashboard();
                if (target === "patients") loadPatients();
                if (target === "doctors") loadDoctors();  // ✅ Added
                if (target === "wards") loadBeds();
            }
        });
    });
}

/* =========================
   MODAL FUNCTIONS (MISSING!)
========================= */
function openAddForm() { 
    document.getElementById("addModal").style.display = "block"; 
}

function closeAddForm() { 
    document.getElementById("addModal").style.display = "none"; 
}

function closeViewForm() { 
    document.getElementById("viewModal").style.display = "none"; 
}

function closeEditForm() { 
    document.getElementById("editModal").style.display = "none"; 
}

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    });
}

/* =========================
   INIT (Fixed - Call loadAllDoctors)
========================= */
window.onload = () => {
    loadDashboard();
    loadAllDoctors();
    loadPatients();
    loadBeds();
    loadDoctors();
    initNavbar();

    // Show dashboard by default
    document.querySelectorAll("section").forEach(sec => {
        sec.style.display = sec.id === "dashboard" ? "block" : "none";
    });

    // Search listeners
    document.getElementById("search").addEventListener("keyup", function() {
        loadPatients(this.value);
    });

    document.getElementById("bedSearch").addEventListener("keyup", function() {
        loadBeds(this.value);
    });

    // Doctor search listener (moved here from DOMContentLoaded)
    const doctorSearch = document.getElementById('doctorSearch');
    if (doctorSearch) {
        doctorSearch.addEventListener('input', function() {
            loadDoctors(this.value);
        });
    }
};

/* =========================
   LOAD BEDS (SIMPLE)
========================= */
async function loadBeds(search = "") {
    try {
        const res = await fetch(`${API}/api/beds?search=${encodeURIComponent(search)}`);
        const data = await res.json();

        const table = document.getElementById("bedsTable");
        table.innerHTML = "";

        if (data.length === 0) {
            table.innerHTML = `<tr><td colspan="5" style="text-align:center;">No beds found</td></tr>`;
            return;
        }

        data.forEach(b => {
            const status = b.patient_name ? 'Occupied' : 'Available';
            const statusClass = b.patient_name ? 'occupied' : 'available';
            
            table.innerHTML += `
            <tr class="${statusClass}">
                <td>${b.bed_id}</td>
                <td>${b.ward_name} - ${b.bed_number}</td>
                <td>${status}</td>
                <td>${b.patient_name || 'Empty'}</td>
                <td class="actions">
                    ${b.patient_name ? 
                        `
                        <button class="view-btn" onclick="viewPatient(${b.patient_id})" title="View Patient">👁️</button>
                        <button class="edit-btn" onclick="editBed(${b.bed_id})" title="Change Patient">✏️</button>
                        <button class="delete-btn" onclick="dischargePatient(${b.bed_id})" title="Discharge">🏥</button>
                        ` : 
                        `<button class="assign-btn" onclick="assignPatient(${b.bed_id})" title="Assign Patient">👤</button>`
                    }
                </td>
            </tr>`;
        });
    } catch (err) {
        console.error("Load Beds Error:", err);
    }
}

/* =========================
   ASSIGN PATIENT TO BED
========================= */
async function assignPatient(bedId) {
    const patientId = prompt("Enter Patient ID to assign:");
    if (!patientId) return;

    try {
        await fetch(`${API}/api/beds/${bedId}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patient_id: parseInt(patientId) })
        });
        loadBeds();
        loadDashboard();
        alert("✅ Patient assigned to bed!");
    } catch (err) {
        alert("❌ Error assigning patient");
    }
}

/* =========================
   DISCHARGE PATIENT (Make bed empty)
========================= */
async function dischargePatient(bedId) {
    if (!confirm("Discharge patient and free this bed?")) return;
    
    try {
        await fetch(`${API}/api/beds/${bedId}/discharge`, { 
            method: "POST" 
        });
        loadBeds();
        loadDashboard();
        alert("✅ Bed freed! Patient discharged.");
    } catch (err) {
        alert("❌ Discharge failed");
    }
}

/* =========================
   EDIT BED ASSIGNMENT
========================= */
async function editBed(bedId) {
    const newPatientId = prompt("Enter new Patient ID (or 0 to empty):");
    if (!newPatientId || newPatientId === "") return;
    
    try {
        await fetch(`${API}/api/beds/${bedId}/assign`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patient_id: parseInt(newPatientId) || null })
        });
        loadBeds();
        alert("✅ Bed updated!");
    } catch (err) {
        alert("❌ Update failed");
    }
}

// ==================== DOCTOR FUNCTIONS ====================

/* =========================
   LOAD DOCTORS TABLE
========================= */
async function loadDoctors(search = '') {
    const tableBody = document.getElementById('doctorsTable');
    if (!tableBody) {
        console.error('doctorsTable element not found');
        return;
    }
    
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Loading doctors...</td></tr>';
    
    try {
        const res = await fetch(`${API}/api/doctors${search ? `?search=${encodeURIComponent(search)}` : ''}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const doctors = await res.json();
        
        if (doctors.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No doctors found matching "' + search + '"</td></tr>';
            return;
        }
        
        tableBody.innerHTML = doctors.map(doctor => `
            <tr>
                <td>${doctor.doctor_id}</td>
                <td>${doctor.full_name}</td>
                <td>${doctor.phone || '-'}</td>
                <td>${doctor.clinic_name || '-'}</td>
                <td>${doctor.address || '-'}</td>
                <td class="actions">
                    <button class="view-btn" onclick="viewDoctor(${doctor.doctor_id})" title="View Details">👁️</button>
                    <button class="edit-btn" onclick="editDoctorNew(${doctor.doctor_id})" title="Edit">✏️</button>
                    <button class="delete-btn" onclick="deleteDoctor(${doctor.doctor_id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Error loading doctors:', err);
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red;">Error loading doctors</td></tr>';
    }
}

/* =========================
   VIEW DOCTOR - FINAL FIX
========================= */
async function viewDoctor(id) {
    try {
        const res = await fetch(`${API}/api/doctors/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const doctor = await res.json();
        console.log("🔍 VIEW DOCTOR DATA:", doctor); // 🧪 DEBUG
        
        document.getElementById("viewDoctorTitle").textContent = `${doctor.full_name} - Doctor Details`;
        document.getElementById("viewDoctorContent").innerHTML = `
            <div class="doctor-details">
                <p><strong>ID:</strong> ${doctor.doctor_id}</p>
                <p><strong>Full Name:</strong> ${doctor.full_name}</p>
                <p><strong>Phone:</strong> ${doctor.phone || 'N/A'}</p>
                <p><strong>Address:</strong> ${doctor.address || 'N/A'}</p>  <!-- ✅ lowercase address -->
                <p><strong>Clinic:</strong> ${doctor.clinic_name || 'N/A'}</p>
            </div>
        `;
        document.getElementById("viewDoctorModal").style.display = "block";
    } catch (err) {
        console.error("View Doctor Error:", err);
        alert("Error loading doctor details");
    }
}

/* =========================
   EDIT DOCTOR - FIXED (populate form)
========================= */
async function editDoctorNew(id) {
    try {
        const res = await fetch(`${API}/api/doctors/${id}`);
        const doctor = await res.json();
        
        // Populate
        document.getElementById("editDoctorIdNew").value = doctor.doctor_id;
        document.getElementById("editDoctorName").value = doctor.full_name;
        document.getElementById("editDoctorPhone").value = doctor.phone || '';
        document.getElementById("editDoctorAddress").value = doctor.address || '';
        document.getElementById("editDoctorClinic").value = doctor.clinic_name || '';
        
        document.getElementById("editDoctorModalNew").style.display = "block";
    } catch (e) {
        alert("Error loading doctor");
    }
}

function closeEditDoctorNew() {
    document.getElementById("editDoctorModalNew").style.display = "none";
}

document.getElementById("saveEditDoctorBtn")?.addEventListener("click", updateDoctorPerfect);

async function updateDoctorPerfect() {
    const id = document.getElementById("editDoctorIdNew").value;
    const full_name = document.getElementById("editDoctorName").value.trim();
    const phone = document.getElementById("editDoctorPhone").value.trim();
    const address = document.getElementById("editDoctorAddress").value.trim();
    const clinic_name = document.getElementById("editDoctorClinic").value.trim();

    if (!full_name || !id) return alert("Invalid data!");

    try {
        const res = await fetch(`${API}/api/doctors/${id}`, {
            method: "PUT",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({full_name, phone, clinic_name, address})
        });
        
        if (res.ok) {
            closeEditDoctorNew();
            loadDoctors();
            alert("✅ Doctor updated!");
        }
    } catch (e) {
        alert("❌ Update failed");
    }
}

/* =========================
   SAVE NEW DOCTOR - PERFECT ORDER
========================= */
// 🔥 ADD DOCTOR - NEW SYSTEM
function openAddDoctorNew() {
    document.getElementById("newDoctorName").value = '';
    document.getElementById("newDoctorPhone").value = '';
    document.getElementById("newDoctorAddress").value = '';
    document.getElementById("newDoctorClinic").value = '';
    document.getElementById("addDoctorModalNew").style.display = "block";
}

function closeAddDoctorNew() {
    document.getElementById("addDoctorModalNew").style.display = "none";
}

document.getElementById("saveNewDoctorBtn")?.addEventListener("click", saveNewDoctorPerfect);

async function saveNewDoctorPerfect() {
    const full_name = document.getElementById("newDoctorName").value.trim();
    const phone = document.getElementById("newDoctorPhone").value.trim();
    const address = document.getElementById("newDoctorAddress").value.trim();
    const clinic_name = document.getElementById("newDoctorClinic").value.trim();

    if (!full_name) return alert("Name required!");

    try {
        const res = await fetch(`${API}/api/doctors`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({full_name, phone, address, clinic_name})
        });
        
        if (res.ok) {
            closeAddDoctorNew();
            loadDoctors();
            alert("✅ Doctor added!");
        }
    } catch (e) {
        alert("❌ Error adding doctor");
    }
}



/* =========================
   UPDATE DOCTOR - FIXED ORDER
========================= */
async function updateDoctor() {
    const id = document.getElementById("edit_doctor_id").value;
    const full_name = document.getElementById("edit_full_name").value.trim();
    const phone = document.getElementById("edit_phone").value.trim();
    const clinic_name = document.getElementById("edit_clinic_name").value.trim();  // ✅ MOVED UP
    const address = document.getElementById("edit_address").value.trim();         // ✅ MOVED DOWN

    console.log("🧪 UPDATE DOCTOR DATA:", { id, full_name, phone, clinic_name, address });

    if (!full_name || !id) {
        alert("Please fill doctor's name");
        return;
    }

    try {
        const res = await fetch(`${API}/api/doctors/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                full_name, 
                phone, 
                clinic_name,  // ✅ FIRST
                address       // ✅ SECOND
            })
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to update doctor');
        }
        
        closeEditDoctorForm();
        loadDoctors();      // Refresh table
        loadAllDoctors();   // Refresh dropdowns
        alert('✅ Doctor updated successfully!');
    } catch (err) {
        console.error('Error updating doctor:', err);
        alert('❌ Error: ' + err.message);
    }
}

/* =========================
   DELETE DOCTOR
========================= */
async function deleteDoctor(id) {
    if (!confirm('Are you sure you want to delete this doctor? This cannot be undone!')) {
        return;
    }

    try {
        const res = await fetch(`${API}/api/doctors/${id}`, { 
            method: 'DELETE' 
        });
        
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to delete doctor');
        }
        
        loadDoctors();
        loadDashboard();
        loadAllDoctors(); // Refresh patient dropdowns
        alert('✅ Doctor deleted successfully!');
    } catch (err) {
        console.error('Error deleting doctor:', err);
        alert('❌ Error deleting doctor: ' + err.message);
    }
}

/* =========================
   DOCTOR MODAL FUNCTIONS
========================= */
function openAddDoctorForm() { 
    clearAddDoctorForm();
    document.getElementById("addDoctorModal").style.display = "block"; 
}

function closeAddDoctorForm() { 
    document.getElementById("addDoctorModal").style.display = "none"; 
}

function closeViewDoctorForm() { 
    document.getElementById("viewDoctorModal").style.display = "none"; 
}

function closeEditDoctorForm() { 
    document.getElementById("editDoctorModal").style.display = "none"; 
}

function clearAddDoctorForm() {
    document.getElementById("add_full_name").value = '';
    document.getElementById("add_phone").value = '';
    document.getElementById("add_address").value = '';  // ✅ lowercase ID
    document.getElementById("add_clinic_name").value = '';
}
