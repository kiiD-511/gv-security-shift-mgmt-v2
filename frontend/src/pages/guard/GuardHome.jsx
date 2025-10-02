/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/guard/GuardHome.jsx
import { useEffect, useState } from "react";
import { useApi } from "../../api";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import { useToast } from "../../hooks/useToast.jsx";
import "../../styles/Dash.css";

export default function GuardHome() {
  const api = useApi();
  const navigate = useNavigate();
  const { showToast, ToastContainer } = useToast();

  // ---------- State ----------
  const [myShifts, setMyShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [myIncidents, setMyIncidents] = useState([]);

  const [modal, setModal] = useState({ type: null, data: null });
  const [incidentForm, setIncidentForm] = useState({
    shiftId: null,
    description: "",
    severity: "low",
  });

  const [statusFilter, setStatusFilter] = useState("all");

  // ---------- Logout ----------
  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  // ---------- Modal ----------
  const openModal = (type, data = null) => {
    if (type === "incident" && data) {
      setIncidentForm({ shiftId: data.id, description: "", severity: "low" });
    }
    setModal({ type, data });
  };

  const closeModal = () => {
    setModal({ type: null, data: null });
    setIncidentForm({ shiftId: null, description: "", severity: "low" });
  };

  // ---------- Data Fetch ----------
  const fetchData = async () => {
    try {
      const [shifts, att, inc] = await Promise.all([
        api("/shifts/"),
        api("/attendance/"),
        api("/incidents/"),
      ]);

      // ✅ Replace entirely with server truth (ensures deletions are reflected)
      setMyShifts(shifts || []);
      setAttendance(att || []);
      setMyIncidents(inc || []);
    } catch (err) {
      console.error("❌ Failed to fetch guard data:", err);
      showToast("❌ Failed to load guard data", "error");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000); // refresh every 20s
    return () => clearInterval(interval);
  }, []);

  // ---------- Attendance ----------
  const checkIn = async (shiftId) => {
    try {
      const res = await api("/attendance/check_in/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shift: shiftId }),
      });
      // ✅ Replace that record in state
      setAttendance((prev) =>
        prev.map((a) => (a.shift === shiftId ? res : a)).concat(
          prev.some((a) => a.shift === shiftId) ? [] : [res]
        )
      );
      showToast(
        `✅ Checked in at ${new Date(res.check_in_time).toLocaleString()}`,
        "success"
      );
    } catch {
      showToast("❌ Check-in failed", "error");
    }
  };

  const checkOut = async (shiftId) => {
    try {
      const res = await api("/attendance/check_out/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shift: shiftId }),
      });
      setAttendance((prev) =>
        prev.map((a) => (a.shift === shiftId ? res : a)).concat(
          prev.some((a) => a.shift === shiftId) ? [] : [res]
        )
      );
      showToast(
        `✅ Checked out at ${new Date(res.check_out_time).toLocaleString()}`,
        "success"
      );
    } catch {
      showToast("❌ Check-out failed", "error");
    }
  };

  // ---------- Incidents ----------
  const submitIncident = async () => {
    if (!incidentForm.description.trim()) {
      return showToast("❌ Description required", "error");
    }
    try {
      const incident = await api("/incidents/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shift: incidentForm.shiftId,
          severity: incidentForm.severity,
          description: incidentForm.description,
        }),
      });
      setMyIncidents((prev) =>
        prev.map((i) => (i.id === incident.id ? incident : i)).concat(
          prev.some((i) => i.id === incident.id) ? [] : [incident]
        )
      );
      closeModal();
      showToast("📢 Incident submitted (status: pending)", "info");
    } catch {
      showToast("❌ Failed to submit incident", "error");
    }
  };

  // ---------- Derived ----------
  const processedAttendance = attendance.map((a) => {
    const status =
      a.check_out_time && a.status === "pending"
        ? "complete"
        : a.status || "pending";
    return { ...a, displayStatus: status };
  });

  // ---------- UI ----------
  return (
    <>
      {/* Navbar */}
      <nav className="navbar">
        <a href="/dashboard">Dashboard</a>
        <button onClick={handleLogout}>Logout</button>
      </nav>

      <div className="container guard-portal">
        <h1 className="page-title">Guard Portal</h1>

        {/* Shifts */}
        <section className="section">
          <h2 className="section-title">My Shifts</h2>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Site</th>
                <th>Start</th>
                <th>End</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myShifts.map((s) => (
                <tr key={s.id}>
                  <td>{s.site_name}</td>
                  <td>{new Date(s.start).toLocaleString()}</td>
                  <td>{new Date(s.end).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => checkIn(s.id)}
                      className="btn btn-primary btn-sm"
                    >
                      Check In
                    </button>
                    <button
                      onClick={() => checkOut(s.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      Check Out
                    </button>
                    <button
                      onClick={() => openModal("incident", s)}
                      className="btn btn-danger btn-sm"
                    >
                      Report Incident
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Attendance Logs */}
        <section className="section">
          <h2 className="section-title">My Attendance Logs</h2>
          <div className="filters">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="complete">Complete</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
              <option value="absent">Absent</option>
            </select>
          </div>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Shift</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {processedAttendance
                .filter(
                  (a) => statusFilter === "all" || a.displayStatus === statusFilter
                )
                .map((a) => (
                  <tr key={a.id}>
                    <td>Shift {a.shift}</td>
                    <td>
                      {a.check_in_time
                        ? new Date(a.check_in_time).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      {a.check_out_time
                        ? new Date(a.check_out_time).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      <span className={`badge ${a.displayStatus}`}>
                        {a.displayStatus}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>

        {/* Incidents */}
        <section className="section">
          <h2 className="section-title">My Incident Reports</h2>
          <div className="filters">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Description</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myIncidents
                .filter(
                  (i) => statusFilter === "all" || i.status === statusFilter
                )
                .map((i) => (
                  <tr key={i.id}>
                    <td>{i.description}</td>
                    <td>{new Date(i.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${i.status}`}>{i.status}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>

        {/* Toast Notifications */}
        <ToastContainer />

        {/* Incident Modal */}
        <Modal isOpen={modal.type === "incident"} onClose={closeModal}>
          <h3 className="modal-title">
            Report Incident (Shift {incidentForm.shiftId})
          </h3>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Describe the incident..."
            value={incidentForm.description}
            onChange={(e) =>
              setIncidentForm({ ...incidentForm, description: e.target.value })
            }
          />
          <select
            className="form-select"
            value={incidentForm.severity}
            onChange={(e) =>
              setIncidentForm({ ...incidentForm, severity: e.target.value })
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <div className="action-buttons">
            <button onClick={closeModal} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={submitIncident} className="btn btn-primary">
              Submit
            </button>
          </div>
        </Modal>
      </div>
    </>
  );
}

