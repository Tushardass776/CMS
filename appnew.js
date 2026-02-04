const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "Admin@Docwell";
const STORAGE_KEY = "docwell_cms_state";
const SESSION_KEY = "docwell_session";
const MEDICINE_CATEGORIES = [
  "FACE WASH",
  "SUNSCREEN",
  "HAIR SERUM",
  "FACE SERUM",
  "HAIR SHAMPOO",
  "MOISTURIZING CREAM",
  "ALL CREAM",
  "TABLETS",
];

const state = {
  patients: [],
  inventory: {},
  messages: [],
  calendarView: "week",
};

const elements = {
  authWrapper: document.getElementById("authWrapper"),
  lockScreen: document.getElementById("lockScreen"),
  appRoot: document.getElementById("appRoot"),
  loginForm: document.getElementById("loginForm"),
  unlockForm: document.getElementById("unlockForm"),
  lockBtn: document.getElementById("lockBtn"),
  sectionTitle: document.getElementById("sectionTitle"),
  sectionSubtitle: document.getElementById("sectionSubtitle"),
  navLinks: document.querySelectorAll(".nav-link"),
  sections: document.querySelectorAll(".section"),
  patientTableBody: document.querySelector("#patientTable tbody"),
  patientSearch: document.getElementById("patientSearch"),
  patientFilter: document.getElementById("patientFilter"),
  patientDateFilter: document.getElementById("patientDateFilter"),
  newPatientBtn: document.getElementById("newPatientBtn"),
  patientModal: document.getElementById("patientModal"),
  patientForm: document.getElementById("patientForm"),
  patientModalTitle: document.getElementById("patientModalTitle"),
  todayCount: document.getElementById("todayCount"),
  monthlyRevenue: document.getElementById("monthlyRevenue"),
  pendingPayments: document.getElementById("pendingPayments"),
  lowStockCount: document.getElementById("lowStockCount"),
  upcomingAppointments: document.getElementById("upcomingAppointments"),
  topProcedures: document.getElementById("topProcedures"),
  calendarView: document.getElementById("calendarView"),
  calendarDate: document.getElementById("calendarDate"),
  weekViewBtn: document.getElementById("weekViewBtn"),
  dayViewBtn: document.getElementById("dayViewBtn"),
  messageTableBody: document.querySelector("#messageTable tbody"),
  runAutomation: document.getElementById("runAutomation"),
  columnViewBtn: document.getElementById("columnViewBtn"),
  listViewBtn: document.getElementById("listViewBtn"),
  inventoryColumnView: document.getElementById("inventoryColumnView"),
  inventoryListView: document.getElementById("inventoryListView"),
  inventoryTableBody: document.querySelector("#inventoryTable tbody"),
  inventorySearch: document.getElementById("inventorySearch"),
  inventoryCategoryFilter: document.getElementById(
    "inventoryCategoryFilter"
  ),
  inventoryModal: document.getElementById("inventoryModal"),
  inventoryModalTitle: document.getElementById("inventoryModalTitle"),
  inventoryForm: document.getElementById("inventoryForm"),
  downloadPatients: document.getElementById("downloadPatients"),
  downloadInventory: document.getElementById("downloadInventory"),
  medicineCategorySelect: document.getElementById("medicineCategory"),
  medicineNameSelect: document.getElementById("medicineName"),
  nextAppointmentNeeded: document.getElementById("nextAppointmentNeeded"),
  followupFields: document.getElementById("followupFields"),
  revenueSummary: document.getElementById("revenueSummary"),
  sessionSummary: document.getElementById("sessionSummary"),
  toastContainer: document.getElementById("toast-container"),
};

const sectionMeta = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Single-clinic overview for DOCWELL.",
  },
  patients: {
    title: "Patients",
    subtitle: "Track consultations, packages, sessions, and billing.",
  },
  calendar: {
    title: "Calendar",
    subtitle: "Drag, drop, and avoid double booking for every visit.",
  },
  whatsapp: {
    title: "WhatsApp Automation",
    subtitle: "Hourly reminders with consent-based triggers.",
  },
  inventory: {
    title: "Medicine Stock",
    subtitle: "Excel-style columns matching DOCWELL inventory sheets.",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Revenue, session progress, and low stock insights.",
  },
};

const createEmptyInventory = () => {
  const inventory = {};
  MEDICINE_CATEGORIES.forEach((category) => {
    inventory[category] = [];
  });
  return inventory;
};

const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    state.patients = parsed.patients || [];
    state.inventory = parsed.inventory || createEmptyInventory();
    state.messages = parsed.messages || [];
  } else {
    state.inventory = createEmptyInventory();
  }
};

const saveState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const showToast = (message, type = "success") => {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

const calculateNextAppointment = (procedureName, currentDate) => {
  const baseDate = new Date(currentDate);
  const procedure = procedureName.toLowerCase();
  if (procedure.includes("laser")) {
    baseDate.setDate(baseDate.getDate() + 28);
  } else if (procedure.includes("prp")) {
    baseDate.setDate(baseDate.getDate() + 30);
  } else if (procedure.includes("peel")) {
    baseDate.setDate(baseDate.getDate() + 21);
  } else {
    baseDate.setDate(baseDate.getDate() + 14);
  }
  return baseDate.toISOString().split("T")[0];
};

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN")}`;

const computeTotals = (patient) => {
  const totalBill =
    Number(patient.consultationFee || 0) +
    Number(patient.procedureFee || 0) +
    Number(patient.medicineCharges || 0);
  const pending = totalBill - Number(patient.amountPaid || 0);
  return { totalBill, pending };
};

const computeInventoryStatus = (item) => {
  const now = new Date();
  const expiryDate = new Date(item.expiry);
  const diffDays = (expiryDate - now) / (1000 * 60 * 60 * 24);
  if (diffDays <= 0) {
    return { label: "Expired", className: "danger", expiryAlert: true };
  }
  if (Number(item.quantity) <= Number(item.reorderLevel)) {
    return { label: "Low Stock", className: "warning", expiryAlert: false };
  }
  return { label: "In Stock", className: "success", expiryAlert: diffDays <= 30 };
};

const openModal = (modal) => {
  modal.style.display = "flex";
};

const closeModal = (modal) => {
  modal.style.display = "none";
};

const updateFollowupRequirement = (value) => {
  const needsFollowup = value === "yes";
  elements.followupFields.classList.toggle("disabled", !needsFollowup);
  elements.patientForm.nextAppointmentDate.required = needsFollowup;
  elements.patientForm.preferredTimeSlot.required = needsFollowup;
  if (!needsFollowup) {
    elements.patientForm.nextAppointmentDate.value = "";
    elements.patientForm.preferredTimeSlot.value = "";
  }
};

const getFilteredPatients = () => {
  const search = elements.patientSearch.value.toLowerCase();
  const filter = elements.patientFilter.value;
  const dateFilter = elements.patientDateFilter.value;
  const today = new Date().toISOString().split("T")[0];
  return state.patients.filter((patient) => {
    const matchesSearch =
      patient.patientName.toLowerCase().includes(search) ||
      patient.procedureName.toLowerCase().includes(search) ||
      patient.concerns.join(", ").toLowerCase().includes(search);
    const { pending } = computeTotals(patient);
    const matchesFilter =
      filter === "pending"
        ? pending > 0
        : filter === "today"
          ? patient.visitDate === today
          : true;
    const matchesDate = dateFilter ? patient.visitDate === dateFilter : true;
    return matchesSearch && matchesFilter && matchesDate;
  });
};

const renderPatients = () => {
  const rows = getFilteredPatients()
    .map((patient, index) => {
      const { totalBill, pending } = computeTotals(patient);
      const pendingClass = pending > 0 ? "pending-highlight" : "";
      const nextDate = patient.nextAppointmentDate || "Not scheduled";
      const nextTime = patient.preferredTimeSlot || "";
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${patient.visitDate}</td>
          <td>${patient.patientName}<br /><small>${patient.ageGender}</small></td>
          <td>${patient.concerns.join(", ")}</td>
          <td>${patient.procedureName}</td>
          <td>${patient.sessionNo || "-"}</td>
          <td>${formatCurrency(totalBill)}</td>
          <td>${formatCurrency(patient.amountPaid)}</td>
          <td class="${pendingClass}">${formatCurrency(pending)}</td>
          <td>${patient.appointmentStatus}</td>
          <td>${nextDate} ${nextTime}</td>
          <td>
            <button class="btn ghost" data-edit="${patient.id}">Edit</button>
            <button class="btn" data-delete="${patient.id}">Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
  elements.patientTableBody.innerHTML =
    rows ||
    `<tr><td colspan="12">No records found. Add a patient to begin.</td></tr>`;
};

const renderDashboard = () => {
  const today = new Date().toISOString().split("T")[0];
  const todayCount = state.patients.filter(
    (patient) => patient.visitDate === today
  ).length;
  const monthlyRevenue = state.patients.reduce(
    (sum, patient) => sum + computeTotals(patient).totalBill,
    0
  );
  const pendingPayments = state.patients.reduce(
    (sum, patient) => sum + computeTotals(patient).pending,
    0
  );

  elements.todayCount.textContent = todayCount;
  elements.monthlyRevenue.textContent = formatCurrency(monthlyRevenue);
  elements.pendingPayments.textContent = formatCurrency(pendingPayments);

  const lowStockItems = getInventoryItems().filter((item) => {
    const status = computeInventoryStatus(item);
    return status.label !== "In Stock" || status.expiryAlert;
  });
  elements.lowStockCount.textContent = lowStockItems.length;

  const upcoming = state.patients
    .filter(
      (patient) =>
        patient.nextAppointmentDate &&
        new Date(patient.nextAppointmentDate) >= new Date()
    )
    .sort(
      (a, b) =>
        new Date(a.nextAppointmentDate) - new Date(b.nextAppointmentDate)
    )
    .slice(0, 5)
    .map(
      (patient) => `
      <div class="list-item">
        <div>
          <strong>${patient.patientName}</strong>
          <p>${patient.procedureName}</p>
        </div>
        <span>${patient.nextAppointmentDate}</span>
      </div>
    `
    )
    .join("");
  elements.upcomingAppointments.innerHTML =
    upcoming || "<p>No upcoming appointments.</p>";

  const procedures = {};
  state.patients.forEach((patient) => {
    procedures[patient.procedureName] =
      (procedures[patient.procedureName] || 0) + 1;
  });
  const topProcedures = Object.entries(procedures)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(
      ([procedure, count]) => `
      <div class="list-item">
        <span>${procedure}</span>
        <strong>${count}</strong>
      </div>
    `
    )
    .join("");
  elements.topProcedures.innerHTML =
    topProcedures || "<p>No procedure data yet.</p>";
};

const renderCalendar = () => {
  const referenceDate = elements.calendarDate.value
    ? new Date(elements.calendarDate.value)
    : new Date();
  const start = new Date(referenceDate);
  if (state.calendarView === "week") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
  }

  const days = state.calendarView === "week" ? 7 : 1;
  const dayCells = [];
  for (let i = 0; i < days; i += 1) {
    const dayDate = new Date(start);
    dayDate.setDate(start.getDate() + i);
    const dateString = dayDate.toISOString().split("T")[0];
    const appointments = state.patients.filter(
      (patient) => patient.nextAppointmentDate === dateString
    );
    const appointmentCards = appointments
      .map(
        (patient) => `
        <div
          class="appointment-card"
          draggable="true"
          data-id="${patient.id}"
        >
          <strong>${patient.patientName}</strong><br />
          ${patient.preferredTimeSlot} • ${patient.procedureName}
        </div>
      `
      )
      .join("");
    dayCells.push(`
      <div class="calendar-day" data-date="${dateString}">
        <h4>${dayDate.toDateString()}</h4>
        ${appointmentCards || "<p>No appointments</p>"}
      </div>
    `);
  }

  elements.calendarView.innerHTML = `
    <div class="calendar-grid">
      ${dayCells.join("")}
    </div>
  `;

  document.querySelectorAll(".appointment-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", card.dataset.id);
    });
  });

  document.querySelectorAll(".calendar-day").forEach((day) => {
    day.addEventListener("dragover", (event) => event.preventDefault());
    day.addEventListener("drop", (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData("text/plain");
      const patient = state.patients.find((record) => record.id === id);
      if (!patient) return;
      const targetDate = day.dataset.date;
      const conflict = state.patients.find(
        (record) =>
          record.nextAppointmentDate === targetDate &&
          record.preferredTimeSlot === patient.preferredTimeSlot &&
          record.id !== id
      );
      if (conflict) {
        showToast("Time slot already booked.", "warning");
        return;
      }
      patient.nextAppointmentDate = targetDate;
      saveState();
      renderAll();
      showToast("Appointment rescheduled.", "success");
    });
  });
};

const getInventoryItems = () =>
  Object.entries(state.inventory).flatMap(([category, items]) =>
    items.map((item) => ({ ...item, category }))
  );

const renderInventoryColumns = () => {
  elements.inventoryColumnView.innerHTML = MEDICINE_CATEGORIES.map(
    (category) => {
      const items = state.inventory[category];
      const listing = items
        .map((item) => {
          const status = computeInventoryStatus(item);
          const expiryNote = status.expiryAlert
            ? `<span class="expiry-alert">Expiry alert: 30 days</span>`
            : "";
          return `
          <div class="inventory-item">
            <strong>${item.name}</strong>
            <span>${item.quantity} ${item.unit}</span>
            <span>Expiry: ${item.expiry}</span>
            <span>Sell: ${formatCurrency(item.sellingPrice)}</span>
            ${expiryNote}
            <span class="status ${status.className}">${status.label}</span>
            <div class="actions">
              <button class="btn ghost" data-edit-inventory="${item.id}">Edit</button>
              <button class="btn" data-delete-inventory="${item.id}">Delete</button>
            </div>
          </div>
        `;
        })
        .join("");
      return `
      <div class="inventory-column" data-category="${category}">
        <div class="card-header">
          <h4>${category}</h4>
          <button class="btn primary" data-add-inventory="${category}">Add</button>
        </div>
        <div class="inventory-listing">
          ${listing || "<p>No medicines added.</p>"}
        </div>
      </div>
    `;
    }
  ).join("");
};

const renderInventoryList = () => {
  const search = elements.inventorySearch.value.toLowerCase();
  const categoryFilter = elements.inventoryCategoryFilter.value;
  const items = getInventoryItems().filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search);
    const matchesCategory = categoryFilter ? item.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  elements.inventoryTableBody.innerHTML =
    items
      .map((item) => {
        const status = computeInventoryStatus(item);
        const expiryNote = status.expiryAlert
          ? `<div class="expiry-alert">Expiry alert: 30 days</div>`
          : "";
        return `
      <tr>
        <td>${item.category}</td>
        <td>${item.name}${expiryNote}</td>
        <td>${item.quantity}</td>
        <td>${item.unit}</td>
        <td>${item.expiry}</td>
        <td>${formatCurrency(item.costPrice)}</td>
        <td>${formatCurrency(item.sellingPrice)}</td>
        <td>${item.reorderLevel}</td>
        <td><span class="status ${status.className}">${status.label}</span></td>
        <td>
          <button class="btn ghost" data-edit-inventory="${item.id}">Edit</button>
          <button class="btn" data-delete-inventory="${item.id}">Delete</button>
        </td>
      </tr>
    `;
      })
      .join("") ||
    `<tr><td colspan="10">No inventory items. Add medicines to begin.</td></tr>`;
};

const renderInventoryFilters = () => {
  elements.inventoryCategoryFilter.innerHTML =
    `<option value="">All Categories</option>` +
    MEDICINE_CATEGORIES.map(
      (category) => `<option value="${category}">${category}</option>`
    ).join("");
};

const renderMessages = () => {
  elements.messageTableBody.innerHTML =
    state.messages
      .map(
        (message) => `
        <tr>
          <td>${message.date}</td>
          <td>${message.patient}</td>
          <td>${message.trigger}</td>
          <td>${message.status}</td>
        </tr>
      `
      )
      .join("") ||
    `<tr><td colspan="4">No messages sent yet.</td></tr>`;
};

const renderAnalytics = () => {
  const revenueItems = state.patients.map((patient) => {
    const totals = computeTotals(patient);
    return {
      label: patient.patientName,
      value: totals.totalBill,
    };
  });
  elements.revenueSummary.innerHTML =
    revenueItems
      .map(
        (item) => `
      <div class="list-item">
        <span>${item.label}</span>
        <strong>${formatCurrency(item.value)}</strong>
      </div>
    `
      )
      .join("") || "<p>No billing data yet.</p>";

  const sessionItems = state.patients.map((patient) => {
    const label = patient.packageName || patient.procedureName;
    return {
      label,
      value: patient.sessionNo || "-",
    };
  });
  elements.sessionSummary.innerHTML =
    sessionItems
      .map(
        (item) => `
      <div class="list-item">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </div>
    `
      )
      .join("") || "<p>No session data yet.</p>";
};

const renderAll = () => {
  renderPatients();
  renderDashboard();
  renderCalendar();
  renderInventoryColumns();
  renderInventoryList();
  renderMessages();
  renderAnalytics();
  saveState();
};

const populateMedicineSelectors = () => {
  elements.medicineCategorySelect.innerHTML =
    `<option value="">Select category</option>` +
    MEDICINE_CATEGORIES.map(
      (category) => `<option value="${category}">${category}</option>`
    ).join("");
  elements.medicineNameSelect.innerHTML =
    `<option value="">Select medicine</option>`;
};

const updateMedicineNameOptions = () => {
  const category = elements.medicineCategorySelect.value;
  if (!category) {
    elements.medicineNameSelect.innerHTML =
      `<option value="">Select medicine</option>`;
    return;
  }
  const items = state.inventory[category] || [];
  elements.medicineNameSelect.innerHTML =
    `<option value="">Select medicine</option>` +
    items.map((item) => `<option value="${item.id}">${item.name}</option>`).join("");
};

const updateStockAfterUsage = (patient) => {
  const category = patient.medicineCategory;
  const medicineId = patient.medicineName;
  const usedQuantity = Number(patient.medicineQuantity || 0);
  if (!category || !medicineId || usedQuantity <= 0) return;
  const items = state.inventory[category];
  const item = items.find((entry) => entry.id === medicineId);
  if (!item) return;
  item.quantity = Math.max(0, Number(item.quantity) - usedQuantity);
};

const handlePatientSubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(elements.patientForm);
  const data = Object.fromEntries(formData.entries());
  const concerns = formData.getAll("concerns");
  const patientId = data.id || `patient-${Date.now()}`;

  const patientRecord = {
    id: patientId,
    visitDate: data.visitDate,
    patientName: data.patientName,
    ageGender: data.ageGender,
    contact: data.contact,
    concerns,
    consultationType: data.consultationType,
    procedureName: data.procedureName,
    packageName: data.packageName,
    sessionNo: data.sessionNo,
    perSessionCost: data.perSessionCost,
    totalPackageCost: data.totalPackageCost,
    consultationFee: data.consultationFee,
    procedureFee: data.procedureFee,
    medicineCharges: data.medicineCharges,
    amountPaid: data.amountPaid,
    motivationNotes: data.motivationNotes,
    doctorRemarks: data.doctorRemarks,
    nextAppointmentNeeded: data.nextAppointmentNeeded === "yes",
    nextAppointmentDate: data.nextAppointmentDate,
    preferredTimeSlot: data.preferredTimeSlot,
    appointmentStatus: data.appointmentStatus,
    whatsappConsent: data.whatsappConsent === "true",
    medicineCategory: data.medicineCategory,
    medicineName: data.medicineName,
    medicineQuantity: data.medicineQuantity,
    stockCorrectionReason: data.stockCorrectionReason,
  };

  if (patientRecord.nextAppointmentNeeded) {
    if (!patientRecord.nextAppointmentDate) {
      patientRecord.nextAppointmentDate = calculateNextAppointment(
        patientRecord.procedureName,
        patientRecord.visitDate
      );
      elements.patientForm.nextAppointmentDate.value =
        patientRecord.nextAppointmentDate;
    }
    const conflict = state.patients.find(
      (record) =>
        record.nextAppointmentDate === patientRecord.nextAppointmentDate &&
        record.preferredTimeSlot === patientRecord.preferredTimeSlot &&
        record.id !== patientId
    );
    if (conflict) {
      showToast("Time slot already booked. Choose another time.", "warning");
      return;
    }
  } else {
    patientRecord.nextAppointmentDate = "";
    patientRecord.preferredTimeSlot = "";
  }

  const existingIndex = state.patients.findIndex(
    (patient) => patient.id === patientId
  );
  if (existingIndex >= 0) {
    state.patients[existingIndex] = patientRecord;
    showToast("Patient record updated.", "success");
  } else {
    state.patients.push(patientRecord);
    showToast("Patient record added.", "success");
  }

  updateStockAfterUsage(patientRecord);

  closeModal(elements.patientModal);
  elements.patientForm.reset();
  renderAll();
};

const handlePatientEdit = (id) => {
  const patient = state.patients.find((item) => item.id === id);
  if (!patient) return;
  elements.patientModalTitle.textContent = "Edit Patient";
  const entries = Object.entries(patient);
  entries.forEach(([key, value]) => {
    const field = elements.patientForm.querySelector(`[name="${key}"]`);
    if (!field) return;
    if (field.multiple) {
      Array.from(field.options).forEach((option) => {
        option.selected = patient.concerns.includes(option.value);
      });
    } else {
      field.value = value;
    }
  });
  const needsFollowup =
    patient.nextAppointmentNeeded ?? Boolean(patient.nextAppointmentDate);
  updateFollowupRequirement(needsFollowup ? "yes" : "no");
  openModal(elements.patientModal);
};

const handlePatientDelete = (id) => {
  state.patients = state.patients.filter((patient) => patient.id !== id);
  showToast("Patient record deleted.", "warning");
  renderAll();
};

const handleInventorySubmit = (event) => {
  event.preventDefault();
  const formData = new FormData(elements.inventoryForm);
  const data = Object.fromEntries(formData.entries());
  const itemId = data.id || `inv-${Date.now()}`;
  const category = data.category;

  const inventoryItem = {
    id: itemId,
    name: data.name,
    quantity: data.quantity,
    unit: data.unit,
    expiry: data.expiry,
    costPrice: data.costPrice,
    sellingPrice: data.sellingPrice,
    reorderLevel: data.reorderLevel,
  };

  const items = state.inventory[category];
  const existingIndex = items.findIndex((item) => item.id === itemId);
  if (existingIndex >= 0) {
    items[existingIndex] = inventoryItem;
    showToast("Medicine updated.", "success");
  } else {
    items.push(inventoryItem);
    showToast("Medicine added.", "success");
  }

  closeModal(elements.inventoryModal);
  elements.inventoryForm.reset();
  renderAll();
};

const handleInventoryEdit = (id) => {
  const item = getInventoryItems().find((entry) => entry.id === id);
  if (!item) return;
  elements.inventoryModalTitle.textContent = "Edit Medicine";
  const entries = Object.entries(item);
  entries.forEach(([key, value]) => {
    const field = elements.inventoryForm.querySelector(`[name="${key}"]`);
    if (!field) return;
    field.value = value;
  });
  openModal(elements.inventoryModal);
};

const handleInventoryDelete = (id) => {
  MEDICINE_CATEGORIES.forEach((category) => {
    state.inventory[category] = state.inventory[category].filter(
      (item) => item.id !== id
    );
  });
  showToast("Medicine deleted.", "warning");
  renderAll();
};

const handleRunAutomation = () => {
  const now = new Date();
  const logEntries = [];

  state.patients.forEach((patient) => {
    if (!patient.whatsappConsent || patient.appointmentStatus === "Cancelled") {
      return;
    }
    if (!patient.nextAppointmentDate) {
      return;
    }
    const appointmentDate = new Date(patient.nextAppointmentDate);
    const diffHours = (appointmentDate - now) / (1000 * 60 * 60);
    let trigger = "";
    if (diffHours <= 0 && patient.appointmentStatus === "Missed") {
      trigger = "Missed follow-up";
    } else if (diffHours <= 8 && diffHours > 0) {
      trigger = "Same-day";
    } else if (diffHours <= 24 && diffHours > 8) {
      trigger = "24h reminder";
    } else if (diffHours <= 48 && diffHours > 24) {
      trigger = "48h reminder";
    }
    if (!trigger) return;
    logEntries.push({
      date: now.toLocaleString(),
      patient: patient.patientName,
      trigger,
      status: "Sent",
    });
  });

  state.messages = [...logEntries, ...state.messages].slice(0, 20);
  showToast("WhatsApp reminders executed.", "success");
  renderAll();
};

const downloadPatientsExcel = () => {
  const rows = getFilteredPatients().map((patient, index) => {
    const totals = computeTotals(patient);
    return {
      SN: index + 1,
      "Visit Date": patient.visitDate,
      "Patient Name": patient.patientName,
      "Age / Gender": patient.ageGender,
      "Contact Number": patient.contact,
      "Concern Type": patient.concerns.join(", "),
      "Consultation Type": patient.consultationType,
      "Procedure Name": patient.procedureName,
      "Package Name": patient.packageName,
      "Session No.": patient.sessionNo,
      "Per Session Cost": patient.perSessionCost,
      "Total Package Cost": patient.totalPackageCost,
      "Consultation Fee": patient.consultationFee,
      "Procedure Fee": patient.procedureFee,
      "Medicine Charges": patient.medicineCharges,
      "Total Bill": totals.totalBill,
      "Amount Paid": patient.amountPaid,
      "Pending Amount": totals.pending,
      "Next Appointment Needed": patient.nextAppointmentNeeded ? "Yes" : "No",
      "Next Appointment Date": patient.nextAppointmentDate,
      "Preferred Time Slot": patient.preferredTimeSlot,
      "Appointment Status": patient.appointmentStatus,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Patients");
  styleWorksheet(worksheet);
  const filename = `DOCWELL_Patient_Records_${new Date()
    .toISOString()
    .split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

const downloadInventoryExcel = () => {
  const maxRows = Math.max(
    ...MEDICINE_CATEGORIES.map((category) => state.inventory[category].length),
    1
  );
  const rows = Array.from({ length: maxRows }, (_, rowIndex) => {
    const row = {};
    MEDICINE_CATEGORIES.forEach((category) => {
      const item = state.inventory[category][rowIndex];
      row[category] = item
        ? `${item.name} | ${item.quantity} ${item.unit} | Exp ${item.expiry} | Cost ${item.costPrice} | Sell ${item.sellingPrice} | Reorder ${item.reorderLevel}`
        : "";
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Medicine Stock");
  styleWorksheet(worksheet);
  const filename = `DOCWELL_Medicine_Stock_${new Date()
    .toISOString()
    .split("T")[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
};

const styleWorksheet = (worksheet) => {
  const range = XLSX.utils.decode_range(worksheet["!ref"]);
  for (let C = range.s.c; C <= range.e.c; C += 1) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "16A085" } },
      alignment: { horizontal: "center" },
    };
  }
};

const handleNavigation = (event) => {
  const button = event.target.closest(".nav-link");
  if (!button) return;
  elements.navLinks.forEach((link) => link.classList.remove("active"));
  button.classList.add("active");
  const sectionId = button.dataset.section;
  elements.sections.forEach((section) => {
    section.classList.toggle("active", section.id === sectionId);
  });
  const meta = sectionMeta[sectionId];
  elements.sectionTitle.textContent = meta.title;
  elements.sectionSubtitle.textContent = meta.subtitle;
};

const handleLogin = (event) => {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    localStorage.setItem(SESSION_KEY, "active");
    elements.authWrapper.style.display = "none";
    elements.appRoot.style.display = "flex";
    showToast("Welcome back, Admin.", "success");
  } else {
    showToast("Invalid credentials.", "danger");
  }
};

const handleUnlock = (event) => {
  event.preventDefault();
  const password = document.getElementById("unlockPassword").value.trim();
  if (password === ADMIN_PASSWORD) {
    elements.lockScreen.style.display = "none";
    elements.appRoot.style.display = "flex";
    showToast("Session unlocked.", "success");
  } else {
    showToast("Incorrect password.", "danger");
  }
};

const initializeAuth = () => {
  const session = localStorage.getItem(SESSION_KEY);
  if (session === "active") {
    elements.authWrapper.style.display = "none";
    elements.lockScreen.style.display = "flex";
  } else {
    elements.authWrapper.style.display = "flex";
  }
};

const registerEventListeners = () => {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.unlockForm.addEventListener("submit", handleUnlock);
  elements.lockBtn.addEventListener("click", () => {
    elements.lockScreen.style.display = "flex";
    elements.appRoot.style.display = "none";
  });
  elements.navLinks.forEach((link) => {
    link.addEventListener("click", handleNavigation);
  });
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      closeModal(document.getElementById(button.dataset.close));
    });
  });
  elements.newPatientBtn.addEventListener("click", () => {
    elements.patientModalTitle.textContent = "Add Patient";
    elements.patientForm.reset();
    elements.nextAppointmentNeeded.value = "yes";
    updateFollowupRequirement("yes");
    openModal(elements.patientModal);
  });
  elements.patientForm.addEventListener("submit", handlePatientSubmit);
  elements.patientTableBody.addEventListener("click", (event) => {
    if (event.target.dataset.edit) {
      handlePatientEdit(event.target.dataset.edit);
    }
    if (event.target.dataset.delete) {
      handlePatientDelete(event.target.dataset.delete);
    }
  });
  elements.patientSearch.addEventListener("input", renderPatients);
  elements.patientFilter.addEventListener("change", renderPatients);
  elements.patientDateFilter.addEventListener("change", renderPatients);
  elements.calendarDate.addEventListener("change", renderCalendar);
  elements.weekViewBtn.addEventListener("click", () => {
    state.calendarView = "week";
    elements.weekViewBtn.classList.add("primary");
    elements.dayViewBtn.classList.remove("primary");
    renderCalendar();
  });
  elements.dayViewBtn.addEventListener("click", () => {
    state.calendarView = "day";
    elements.dayViewBtn.classList.add("primary");
    elements.weekViewBtn.classList.remove("primary");
    renderCalendar();
  });
  elements.runAutomation.addEventListener("click", handleRunAutomation);
  elements.columnViewBtn.addEventListener("click", () => {
    elements.columnViewBtn.classList.add("primary");
    elements.listViewBtn.classList.remove("primary");
    elements.inventoryColumnView.classList.remove("hidden");
    elements.inventoryListView.classList.add("hidden");
  });
  elements.listViewBtn.addEventListener("click", () => {
    elements.listViewBtn.classList.add("primary");
    elements.columnViewBtn.classList.remove("primary");
    elements.inventoryColumnView.classList.add("hidden");
    elements.inventoryListView.classList.remove("hidden");
  });
  elements.inventoryColumnView.addEventListener("click", (event) => {
    if (event.target.dataset.addInventory) {
      elements.inventoryModalTitle.textContent = `Add Medicine - ${event.target.dataset.addInventory}`;
      elements.inventoryForm.reset();
      elements.inventoryForm.category.value = event.target.dataset.addInventory;
      openModal(elements.inventoryModal);
    }
    if (event.target.dataset.editInventory) {
      handleInventoryEdit(event.target.dataset.editInventory);
    }
    if (event.target.dataset.deleteInventory) {
      handleInventoryDelete(event.target.dataset.deleteInventory);
    }
  });
  elements.inventoryTableBody.addEventListener("click", (event) => {
    if (event.target.dataset.editInventory) {
      handleInventoryEdit(event.target.dataset.editInventory);
    }
    if (event.target.dataset.deleteInventory) {
      handleInventoryDelete(event.target.dataset.deleteInventory);
    }
  });
  elements.inventoryForm.addEventListener("submit", handleInventorySubmit);
  elements.inventorySearch.addEventListener("input", renderInventoryList);
  elements.inventoryCategoryFilter.addEventListener("change", renderInventoryList);
  elements.downloadPatients.addEventListener("click", downloadPatientsExcel);
  elements.downloadInventory.addEventListener("click", downloadInventoryExcel);
  elements.medicineCategorySelect.addEventListener(
    "change",
    updateMedicineNameOptions
  );
  elements.nextAppointmentNeeded.addEventListener("change", (event) => {
    updateFollowupRequirement(event.target.value);
  });
  elements.patientForm.procedureName.addEventListener("blur", () => {
    if (
      elements.nextAppointmentNeeded.value === "yes" &&
      !elements.patientForm.nextAppointmentDate.value &&
      elements.patientForm.visitDate.value &&
      elements.patientForm.procedureName.value
    ) {
      elements.patientForm.nextAppointmentDate.value = calculateNextAppointment(
        elements.patientForm.procedureName.value,
        elements.patientForm.visitDate.value
      );
    }
  });
};

const initialize = () => {
  loadState();
  populateMedicineSelectors();
  renderInventoryFilters();
  initializeAuth();
  updateFollowupRequirement("yes");
  renderAll();
  registerEventListeners();
};

initialize();
