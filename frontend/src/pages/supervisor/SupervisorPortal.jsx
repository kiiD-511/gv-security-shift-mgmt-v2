/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
// Refactored SupervisorPortal.jsx (no WS + dedupe + deletions handled)
import { useEffect, useState } from "react";
import { useApi } from "../../api";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import { useToast } from "../../hooks/useToast.jsx";
import "../../styles/Dash.css";

export default function SupervisorPortal() {
  const api = useApi();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

  // ---------- State ----------
  const [shifts, setShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [sites, setSites] = useState([]);
  const [guards, setGuards] = useState([]);

  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [kpis, setKpis] = useState({
    onDuty: 0,
    todayIncidents: 0,
    missedShifts: 0,
    pendingReviews: 0,
  });

  const [modal, setModal] = useState({ type: null, data: null });
  const [incidentForm, setIncidentForm] = useState({
    description: "",
    severity: "low",
    site: "",
  });

  const [loading, setLoading] = useState(true);

  // ---------- Modal ----------
  const openModal = (type, data = null) => {
    if (type === "incident") {
      setIncidentForm({
        description: "",
        severity: "low",
        site: data?.site || "",
      });
    }
    setModal({ type, data });
  };

  const closeModal = () => {
    setModal({ type: null, data: null });
    setIncidentForm({ description: "", severity: "low", site: "" });
  };

  // ---------- Auth ----------
  const logout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  // ---------- Fetch Data ----------
  const fetchData = async () => {
    try {
      setLoading(true);
      const [sh, att, inc, st, gd] = await Promise.all([
        api("/shifts/"),
        api("/attendance/"),
        api("/incidents/"),
        api("/sites/"),
        api("/users/"),
      ]);

      // ✅ Replace state fully with API truth
      setShifts(sh || []);
      setAttendance(att || []);
      setIncidents(inc || []);
      setSites(st || []);
      setGuards((gd || []).filter((u) => u.role === "guard" && u.is_active));
    } catch (error) {
      console.error("❌ Failed to load data:", error);
      showToast("❌ Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ---------- KPI Calculation ----------
  useEffect(() => {
    const now = new Date();
    const today = now.toDateString();

    const onDuty = shifts.filter(
      (s) => new Date(s.start) <= now && new Date(s.end) >= now
    ).length;

    const todayIncidents = incidents.filter(
      (i) => new Date(i.created_at).toDateString() === today
    ).length;

    const missedShifts = shifts.filter(
      (s) =>
        new Date(s.end) < now &&
        !attendance.some((a) => a.shift === s.id && a.check_in_time)
    ).length;

    const pendingReviews = incidents.filter((i) => i.status === "pending").length;

    setKpis({ onDuty, todayIncidents, missedShifts, pendingReviews });
  }, [shifts, attendance, incidents]);

  // ---------- Actions ----------
  const markAttendance = async (id, status) => {
    try {
      const updated = await api(`/attendance/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setAttendance((prev) =>
        prev.map((a) => (a.id === id ? updated : a)).concat(
          prev.some((a) => a.id === id) ? [] : [updated]
        )
      );
      closeModal();
      showToast(`✅ Attendance marked as ${status}`, "success");
    } catch {
      showToast("❌ Failed to update attendance", "error");
    }
  };

  const updateIncidentStatus = async (id, status) => {
    try {
      const updated = await api(`/incidents/${id}/update_status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? updated : i)).concat(
          prev.some((i) => i.id === id) ? [] : [updated]
        )
      );
      closeModal();
      showToast(`✅ Incident marked as ${status}`, "success");
    } catch {
      showToast("❌ Failed to update incident status", "error");
    }
  };

  const createIncident = async () => {
    if (!incidentForm.description.trim()) {
      return showToast("❌ Description required", "error");
    }
    try {
      const incident = await api("/incidents/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: incidentForm.description,
          severity: incidentForm.severity,
          site: incidentForm.site,
        }),
      });
      setIncidents((prev) =>
        prev.map((i) => (i.id === incident.id ? incident : i)).concat(
          prev.some((i) => i.id === incident.id) ? [] : [incident]
        )
      );
      closeModal();
      showToast("✅ Incident reported", "success");
    } catch {
      showToast("❌ Failed to report incident", "error");
    }
  };

  // ---------- Export ----------
  const exportCSV = (data, filename) => {
    if (!data.length) {
      showToast("⚠️ No data to export", "info");
      return;
    }
    const header = Object.keys(data[0]).join(",");
    const rows = data.map((row) => Object.values(row).join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    showToast(`✅ Exported ${filename}`, "success");
  };

  // ---------- Filters & Derived ----------
  const processedAttendance = attendance.map((a) => {
    const displayStatus =
      a.check_out_time && a.status === "pending"
        ? "complete"
        : a.status || "pending";
    return { ...a, displayStatus };
  });

  const filteredAttendance = processedAttendance.filter(
    (a) =>
      (attendanceFilter === "all" || a.displayStatus === attendanceFilter) &&
      (!siteFilter || a.site_name === siteFilter) &&
      (!searchTerm ||
        a.user_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredIncidents = incidents.filter(
    (i) =>
      (!severityFilter || i.severity === severityFilter) &&
      (!statusFilter || i.status === statusFilter) &&
      (!siteFilter || i.site_name === siteFilter) &&
      (!searchTerm ||
        i.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getBadgeClass = (value) => {
    const statusMap = {
      complete: "complete",
      pending: "pending",
      reviewed: "reviewed",
      resolved: "resolved",
      late: "late",
      excused: "excused",
      absent: "absent",
      active: "active",
      low: "excused",
      medium: "late",
      high: "absent",
    };
    return `badge ${statusMap[value] || "pending"}`;
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="container">
        <div className="loading" style={{ margin: "2rem auto", display: "block" }} />
        <p style={{ textAlign: "center", color: "#666" }}>
          Loading supervisor data...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">Golden Valley Security Supervisor</div>
        <div>
          <button onClick={fetchData} className="btn-link">🔄 Refresh</button>
          <span className="ml-2">|</span>
          <button onClick={logout} className="btn-link ml-2">🚪 Logout</button>
        </div>
      </nav>

      <div className="container supervisor-portal">
        <h1 className="page-title">Supervisor Portal</h1>

        {/* KPI */}
        <div className="kpi-grid">
          <div className="kpi-card"><div className="value">{kpis.onDuty}</div><div className="label">On Duty Now</div></div>
          <div className="kpi-card"><div className="value">{kpis.todayIncidents}</div><div className="label">Incidents Today</div></div>
          <div className="kpi-card"><div className="value">{kpis.missedShifts}</div><div className="label">Missed Shifts</div></div>
          <div className="kpi-card"><div className="value">{kpis.pendingReviews}</div><div className="label">Pending Reviews</div></div>
        </div>

        {/* Search & Filters */}
        <div className="filters">
          <div className="filter-group" style={{ flex: 1 }}>
            <label>Search</label>
            <input
              type="text"
              placeholder="Search across data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="filter-group">
            <label>Site Filter</label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Shifts */}
        <section className="section">
          <h2 className="section-title">My Site Shifts</h2>
          <table className="table table-striped">
            <thead>
              <tr><th>Site</th><th>Guard</th><th>Start</th><th>End</th><th>Status</th></tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const active = new Date(s.start) <= new Date() && new Date(s.end) >= new Date();
                return (
                  <tr key={s.id}>
                    <td>{s.site_name}</td>
                    <td>{s.assigned_user_name}</td>
                    <td>{new Date(s.start).toLocaleString()}</td>
                    <td>{new Date(s.end).toLocaleString()}</td>
                    <td>
                      {active ? <span className="badge active">On Duty</span> : <span className="badge inactive">Scheduled</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Attendance Logs */}
        <section className="section">
          <h2 className="section-title">Attendance Logs</h2>
          <select
            value={attendanceFilter}
            onChange={(e) => setAttendanceFilter(e.target.value)}
            className="form-select mb-2"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="complete">Complete</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
            <option value="absent">Absent</option>
          </select>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Site</th><th>Guard</th><th>Shift Time</th><th>Check In</th><th>Check Out</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((a) => (
                <tr key={a.id}>
                  <td>{a.site_name}</td>
                  <td>{a.user_name}</td>
                  <td>{a.shift_start && a.shift_end ? `${new Date(a.shift_start).toLocaleTimeString()} - ${new Date(a.shift_end).toLocaleTimeString()}` : "—"}</td>
                  <td>{a.check_in_time ? new Date(a.check_in_time).toLocaleString() : "—"}</td>
                  <td>{a.check_out_time ? new Date(a.check_out_time).toLocaleString() : "—"}</td>
                  <td><span className={`badge ${a.displayStatus}`}>{a.displayStatus}</span></td>
                  <td><button onClick={() => openModal("attendance", a)} className="btn-link">Update</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => exportCSV(filteredAttendance, "attendance.csv")} className="btn btn-secondary mt-2">📊 Export CSV</button>
        </section>

        {/* Incidents */}
        <section className="section">
          <h2 className="section-title">Incident Management</h2>
          <div className="filters">
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="form-select">
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-select">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <table className="table table-striped">
            <thead>
              <tr><th>Description</th><th>Site</th><th>Severity</th><th>Date</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {filteredIncidents.map((i) => (
                <tr key={i.id}>
                  <td>{i.description}</td>
                  <td>{i.site_name || "Unknown"}</td>
                  <td><span className={getBadgeClass(i.severity)}>{i.severity}</span></td>
                  <td>{new Date(i.created_at).toLocaleDateString()}</td>
                  <td><span className={getBadgeClass(i.status)}>{i.status}</span></td>
                  <td><button onClick={() => openModal("incidentReview", i)} className="btn-link">Review</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 mt-2">
            <button onClick={() => exportCSV(filteredIncidents, "incidents.csv")} className="btn btn-secondary">📊 Export CSV</button>
            <button onClick={() => openModal("incident")} className="btn btn-primary">📝 Report Incident</button>
          </div>
        </section>

        {/* Attendance Update Modal */}
        {modal.type === "attendance" && (
          <Modal isOpen onClose={closeModal}>
            <h3 className="modal-title">Update Attendance</h3>
            <p className="text-sm text-gray-600 mb-3">
              Update status for {modal.data?.user_name}'s shift
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={() => markAttendance(modal.data.id, "late")} className="btn btn-warning">⏰ Mark Late</button>
              <button onClick={() => markAttendance(modal.data.id, "excused")} className="btn btn-secondary">📝 Excused</button>
              <button onClick={() => markAttendance(modal.data.id, "absent")} className="btn btn-danger">❌ Mark Absent</button>
            </div>
          </Modal>
        )}

        {/* Incident Review Modal */}
        {modal.type === "incidentReview" && (
          <Modal isOpen onClose={closeModal}>
            <h3 className="modal-title">Review Incident</h3>
            <p><strong>Description:</strong> {modal.data?.description}</p>
            <p><strong>Severity:</strong> <span className={getBadgeClass(modal.data?.severity)}>{modal.data?.severity}</span></p>
            <p><strong>Reported:</strong> {new Date(modal.data?.created_at).toLocaleString()}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => updateIncidentStatus(modal.data.id, "reviewed")} className="btn btn-secondary">👁️ Reviewed</button>
              <button onClick={() => updateIncidentStatus(modal.data.id, "resolved")} className="btn btn-primary">✅ Resolved</button>
            </div>
          </Modal>
        )}

        {/* New Incident Modal */}
        {modal.type === "incident" && (
          <Modal isOpen onClose={closeModal}>
            <h3 className="modal-title">Report New Incident</h3>
            <select value={incidentForm.site} onChange={(e) => setIncidentForm({ ...incidentForm, site: e.target.value })} className="form-select mb-2">
              <option value="">Select Site</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={incidentForm.severity} onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })} className="form-select mb-2">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <textarea value={incidentForm.description} onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })} className="form-input" rows="4" placeholder="Describe the incident..." />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={closeModal} className="btn btn-secondary">Cancel</button>
              <button onClick={createIncident} className="btn btn-primary">📝 Submit Incident</button>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}


