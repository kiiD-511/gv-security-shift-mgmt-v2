/* eslint-disable react-hooks/exhaustive-deps */
// src/pages/admin/AdminDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useApi } from "../../api";
import { useToast } from "../../hooks/useToast.jsx";
import Modal from "../../components/Modal";
import "../../styles/Dash.css";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";

export default function AdminDashboard() {
  const api = useApi();
  const { showToast, ToastContainer } = useToast();
  const navigate = useNavigate();

  // ---------- State ----------
  const [sites, setSites] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [users, setUsers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [kpis, setKpis] = useState({
    todayIncidents: 0,
    onDuty: 0,
    missedShifts: 0,
  });

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ severity: "", site: "" });

  const [page, setPage] = useState(1);
  const perPage = 10;

  const [modal, setModal] = useState({ type: null, data: null });
  const [formData, setFormData] = useState({});

  // ---------- Helpers ----------
  const openModal = (type, data = null) => {
    if (type === "assignSupervisor" && data) {
      setFormData({ supervisors: data.supervisors?.map((s) => s.id) || [] });
    } else if (type === "editShift" && data) {
      setFormData({
        ...data,
        site: data.site,
        user: data.assigned_user,
        start: data.start ? new Date(data.start).toISOString().slice(0, 16) : "",
        end: data.end ? new Date(data.end).toISOString().slice(0, 16) : "",
      });
    } else if (data) {
      setFormData(data);
    } else {
      setFormData({});
    }
    setModal({ type, data });
  };

  const closeModal = () => {
    setModal({ type: null, data: null });
    setFormData({});
  };

  const formatDateTime = (val) => (val ? new Date(val).toISOString() : null);

  // ---------- Data Fetch ----------
  const fetchData = async () => {
    try {
      const [sitesRes, shiftsRes, usersRes, incidentsRes, attendanceRes] =
        await Promise.all([
          api("/sites/"),
          api("/shifts/"),
          api("/users/"),
          api("/incidents/"),
          api("/attendance/"),
        ]);

      setSites(sitesRes || []);
      setShifts(shiftsRes || []);
      setUsers(usersRes || []);
      setIncidents(incidentsRes || []);
      setAttendance(attendanceRes || []);

      // KPIs
      const now = new Date();
      const today = now.toDateString();
      setKpis({
        todayIncidents: (incidentsRes || []).filter(
          (i) => new Date(i.created_at).toDateString() === today
        ).length,
        onDuty: (attendanceRes || []).filter(
          (a) => a.check_in_time && !a.check_out_time
        ).length,
        missedShifts: (shiftsRes || []).filter(
          (s) =>
            new Date(s.end) < now &&
            !(attendanceRes || []).some((a) => a.shift === s.id)
        ).length,
      });
    } catch (err) {
      console.error("Fetch error:", err);
      showToast("❌ Failed to load dashboard data", "error");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  // ---------- Actions (Optimistic Updates) ----------
  const createSite = async (name) => {
    try {
      const newSite = await api("/sites/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setSites((prev) => [...prev, newSite]);
      showToast("✅ Site created successfully", "success");
    } catch {
      showToast("❌ Failed to create site", "error");
    }
  };

  const updateSite = async (id, newName) => {
    try {
      const updatedSite = await api(`/sites/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      setSites((prev) =>
        prev.map((s) => (s.id === id ? updatedSite : s))
      );
      showToast("✅ Site updated", "success");
    } catch {
      showToast("❌ Failed to update site", "error");
    }
  };

  const assignSupervisorsToSite = async (siteId, supervisorIds) => {
    try {
      const updatedSite = await api(`/sites/${siteId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supervisor_ids: supervisorIds }),
      });
      setSites((prev) =>
        prev.map((s) => (s.id === siteId ? updatedSite : s))
      );
      showToast("✅ Supervisors assigned to site", "success");
      closeModal();
    } catch {
      showToast("❌ Failed to assign supervisors", "error");
    }
  };

  const assignShift = async (siteId, userId, start, end) => {
    try {
      const newShift = await api("/shifts/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: Number(siteId),
          assigned_user: Number(userId),
          start: formatDateTime(start),
          end: formatDateTime(end),
        }),
      });
      setShifts((prev) => [...prev, newShift]);
      showToast("✅ Shift assigned", "success");
    } catch {
      showToast("❌ Failed to assign shift", "error");
    }
  };

  const updateShift = async (id, updates) => {
    try {
      const payload = {
        site: Number(updates.site),
        assigned_user: Number(updates.user),
        start: formatDateTime(updates.start),
        end: formatDateTime(updates.end),
      };
      const updatedShift = await api(`/shifts/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setShifts((prev) =>
        prev.map((s) => (s.id === id ? updatedShift : s))
      );
      showToast("✅ Shift updated", "success");
    } catch {
      showToast("❌ Failed to update shift", "error");
    }
  };

  const createUser = async (full_name, email, role, password) => {
    try {
      const newUser = await api("/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, role, password }),
      });
      setUsers((prev) => [...prev, newUser]);
      showToast("✅ User created", "success");
    } catch {
      showToast("❌ Failed to create user", "error");
    }
  };

  const updateUser = async (id, updates) => {
    try {
      const updatedUser = await api(`/users/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? updatedUser : u))
      );
      showToast("✅ User updated", "success");
    } catch {
      showToast("❌ Failed to update user", "error");
    }
  };

  const confirmDelete = (entity, id, fullObject = null) => {
    setModal({ type: "confirmDelete", data: { entity, id, fullObject } });
  };

  const handleDelete = async () => {
    const { entity, id, fullObject } = modal.data || {};
    try {
      if (entity === "shift") {
        await api(`/shifts/${id}/`, { method: "DELETE" });
        setShifts((prev) => prev.filter((s) => s.id !== id));
      } else if (entity === "user") {
        await api(`/users/${id}/`, { method: "DELETE" });
        setUsers((prev) => prev.filter((u) => u.id !== id));
        if (
          fullObject &&
          fullObject.email &&
          auth.currentUser?.email === fullObject.email
        ) {
          await auth.signOut();
          navigate("/login");
        }
      } else if (entity === "site") {
        await api(`/sites/${id}/`, { method: "DELETE" });
        setSites((prev) => prev.filter((s) => s.id !== id));
      }
      showToast("✅ Deleted successfully", "success");
      closeModal();
    } catch {
      showToast("❌ Failed to delete", "error");
    }
  };

  // ---------- Filters ----------
  const filteredIncidents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents.filter((i) => {
      const passSeverity =
        !filters.severity || i.severity === filters.severity;
      const passSite = !filters.site || i.site_name === filters.site;
      const passQuery =
        !q ||
        (i.description && i.description.toLowerCase().includes(q)) ||
        (i.site_name && i.site_name.toLowerCase().includes(q));
      return passSeverity && passSite && passQuery;
    });
  }, [incidents, filters, query]);

  const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / perPage));
  const incidentsPage = filteredIncidents.slice(
    (page - 1) * perPage,
    page * perPage
  );

  // ---------- Badge ----------
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
      scheduled: "pending",
      low: "excused",
      medium: "late",
      high: "absent",
    };
    return `badge ${statusMap[value] || "pending"}`;
  };

  // ---------- Shift Status Derivation ----------
  const deriveShiftStatus = (shift) => {
    const now = new Date();
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    const record = attendance.find((a) => a.shift === shift.id);

    if (record) {
      if (record.check_in_time && !record.check_out_time) {
        return "active";
      }
      if (record.check_in_time && record.check_out_time) {
        return record.status === "pending" ? "complete" : record.status;
      }
      if (!record.check_in_time && end < now) {
        return "absent";
      }
      return record.status || "pending";
    }

    if (end < now) return "absent";
    if (start <= now && end >= now) return "pending";
    return "scheduled";
  };
  // ---------- UI ----------
  return (
    <div>
      <nav className="navbar bg-black text-yellow-400 flex justify-between items-center px-4 py-2 shadow-md">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white text-lg">
            Security Management System
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            className="text-sm hover:text-white transition-colors"
          >
            Refresh
          </button>
          <span className="text-gray-500">|</span>
          <button
            onClick={async () => {
              await auth.signOut();
              navigate("/login");
            }}
            className="text-sm hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="container admin-dashboard">
        <h1 className="page-title">Admin Dashboard</h1>

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="value">{kpis.todayIncidents}</div>
            <div className="label">Incidents Today</div>
          </div>
          <div className="kpi-card">
            <div className="value">{kpis.onDuty}</div>
            <div className="label">On Duty Now</div>
          </div>
          <div className="kpi-card">
            <div className="value">{kpis.missedShifts}</div>
            <div className="label">Missed Shifts</div>
          </div>
        </div>

        {/* Sites */}
        <div className="section">
          <h2 className="section-title">Sites</h2>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Supervisors</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    {s.supervisors
                      ?.map((sup) => sup.full_name)
                      .join(", ") || "No supervisors"}
                  </td>
                  <td>
                    <button
                      onClick={() => openModal("editSite", s)}
                      className="btn-link"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openModal("assignSupervisor", s)}
                      className="btn-link"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => confirmDelete("site", s.id, s)}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => openModal("addSite")}
            className="btn btn-primary mt-2"
          >
            + Add Site
          </button>
        </div>

        {/* Shifts */}
        <div className="section">
          <h2 className="section-title">Shifts</h2>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Site</th>
                <th>Guard</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const site = sites.find((x) => x.id === s.site);
                const user = users.find((x) => x.id === s.assigned_user);
                const status = deriveShiftStatus(s);
                return (
                  <tr key={s.id}>
                    <td>{site ? site.name : "Unknown Site"}</td>
                    <td>{user ? user.full_name : "Unassigned"}</td>
                    <td>{new Date(s.start).toLocaleString()}</td>
                    <td>{new Date(s.end).toLocaleString()}</td>
                    <td>
                      <span className={getBadgeClass(status)}>{status}</span>
                    </td>
                    <td>
                      <button
                        onClick={() => openModal("editShift", s)}
                        className="btn-link"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => confirmDelete("shift", s.id, s)}
                        className="btn-danger"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            onClick={() => openModal("addShift")}
            className="btn btn-primary mt-2"
          >
            + Assign Shift
          </button>
        </div>

        {/* Incidents */}
        <div className="section">
          <h2 className="section-title">Incidents</h2>
          <div className="filters">
            <input
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="form-select"
            />
            <select
              value={filters.severity}
              onChange={(e) =>
                setFilters({ ...filters, severity: e.target.value })
              }
              className="form-select"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <select
              value={filters.site}
              onChange={(e) =>
                setFilters({ ...filters, site: e.target.value })
              }
              className="form-select"
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Description</th>
                <th>Site</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {incidentsPage.map((i) => (
                <tr key={i.id}>
                  <td>
                    <span className={getBadgeClass(i.severity)}>
                      {i.severity}
                    </span>
                  </td>
                  <td>{i.description}</td>
                  <td>{i.site_name || "Unknown"}</td>
                  <td>
                    <span className={getBadgeClass(i.status)}>{i.status}</span>
                  </td>
                  <td>{new Date(i.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between mt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn"
              disabled={page <= 1}
            >
              Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn"
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </div>

        {/* Users */}
        <div className="section">
          <h2 className="section-title">Users</h2>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.full_name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <button
                      onClick={() => openModal("editUser", u)}
                      className="btn-link"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => confirmDelete("user", u.id, u)}
                      className="btn-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => openModal("addUser")}
            className="btn btn-primary mt-2"
          >
            + Add User
          </button>
        </div>

        {/* Supervisors */}
        <div className="section">
          <h2 className="section-title">Supervisors Overview</h2>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Sites</th>
              </tr>
            </thead>
            <tbody>
              {users
                .filter((u) => u.role === "supervisor")
                .map((sup) => {
                  const managedSites = sites.filter((s) =>
                    s.supervisors?.some((sv) => sv.id === sup.id)
                  );
                  return (
                    <tr key={sup.id}>
                      <td>{sup.full_name}</td>
                      <td>{sup.email}</td>
                      <td>
                        {managedSites.length
                          ? managedSites.map((s) => s.name).join(", ")
                          : "None"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Toasts */}
        <ToastContainer />

        {/* Modals */}
        {/* Site Modal */}
        <Modal
          isOpen={modal.type === "addSite" || modal.type === "editSite"}
          onClose={closeModal}
        >
          <h3>{modal.type === "addSite" ? "Add Site" : "Edit Site"}</h3>
          <input
            value={formData.name || ""}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Site name"
            className="input"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                modal.type === "addSite"
                  ? createSite(formData.name)
                  : updateSite(modal.data.id, formData.name);
                closeModal();
              }}
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </Modal>

        {/* Assign Supervisor */}
        <Modal
          isOpen={modal.type === "assignSupervisor"}
          onClose={closeModal}
        >
          <h3>Assign Supervisors to {modal.data?.name}</h3>
          <div>
            {users
              .filter((u) => u.role === "supervisor")
              .map((sup) => (
                <label key={sup.id} className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={formData.supervisors?.includes(sup.id)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...(formData.supervisors || []), sup.id]
                        : formData.supervisors.filter((id) => id !== sup.id);
                      setFormData({ ...formData, supervisors: updated });
                    }}
                  />
                  {sup.full_name}
                </label>
              ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() =>
                assignSupervisorsToSite(
                  modal.data.id,
                  formData.supervisors || []
                )
              }
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </Modal>

        {/* Shift Modal */}
        <Modal
          isOpen={modal.type === "addShift" || modal.type === "editShift"}
          onClose={closeModal}
        >
          <h3>{modal.type === "addShift" ? "Assign Shift" : "Edit Shift"}</h3>

          {/* Site Dropdown with fallback */}
          <select
            value={formData.site || ""}
            onChange={(e) => setFormData({ ...formData, site: e.target.value })}
            className="input"
          >
            <option value="">Select Site</option>
            {formData.site &&
              !sites.some((s) => s.id === Number(formData.site)) && (
                <option value={formData.site} disabled>
                  Unknown Site (was deleted)
                </option>
              )}
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Guard Dropdown with fallback */}
          <select
            value={formData.user || ""}
            onChange={(e) => setFormData({ ...formData, user: e.target.value })}
            className="input"
          >
            <option value="">Select Guard</option>
            {formData.user &&
              !users.some((u) => u.id === Number(formData.user)) && (
                <option value={formData.user} disabled>
                  Unassigned Guard (was deleted)
                </option>
              )}
            {users
              .filter((u) => u.role === "guard")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
          </select>

          <input
            type="datetime-local"
            value={formData.start || ""}
            onChange={(e) =>
              setFormData({ ...formData, start: e.target.value })
            }
            className="input"
          />
          <input
            type="datetime-local"
            value={formData.end || ""}
            onChange={(e) => setFormData({ ...formData, end: e.target.value })}
            className="input"
          />

          <div className="flex justify-end gap-2 mt-3">
            <button onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                modal.type === "addShift"
                  ? assignShift(
                      formData.site,
                      formData.user,
                      formData.start,
                      formData.end
                    )
                  : updateShift(modal.data.id, formData);
                closeModal();
              }}
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </Modal>

        {/* User Modal */}
        <Modal
          isOpen={modal.type === "addUser" || modal.type === "editUser"}
          onClose={closeModal}
        >
          <h3>{modal.type === "addUser" ? "Add User" : "Edit User"}</h3>
          <input
            value={formData.full_name || ""}
            onChange={(e) =>
              setFormData({ ...formData, full_name: e.target.value })
            }
            placeholder="Full name"
            className="input"
          />
          <input
            type="email"
            value={formData.email || ""}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            placeholder="Email"
            className="input"
          />
          {modal.type === "addUser" && (
            <input
              type="password"
              value={formData.password || ""}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder="Password"
              className="input"
            />
          )}
          <select
            value={formData.role || ""}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="input"
          >
            <option value="">Select role</option>
            <option value="admin">Admin</option>
            <option value="supervisor">Supervisor</option>
            <option value="guard">Guard</option>
          </select>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                modal.type === "addUser"
                  ? createUser(
                      formData.full_name,
                      formData.email,
                      formData.role,
                      formData.password
                    )
                  : updateUser(modal.data.id, formData);
                closeModal();
              }}
              className="btn-primary"
            >
              Save
            </button>
          </div>
        </Modal>

        {/* Confirm Delete */}
        <Modal
          isOpen={modal.type === "confirmDelete"}
          onClose={closeModal}
        >
          <p className="text-red-600 font-medium">
            ⚠️ Are you sure you want to delete this {modal.data?.entity}?
          </p>
          <div className="flex justify-between mt-3">
            <button onClick={closeModal} className="btn-secondary">
              Cancel
            </button>
            <button onClick={handleDelete} className="btn-danger">
              Confirm Delete
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
