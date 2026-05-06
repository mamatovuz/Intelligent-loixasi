const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "So'rovda xatolik yuz berdi");
  }

  return data;
}

async function requestFile(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    ...options
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Fayl yuklanmadi");
  }

  return response.text();
}

async function requestBlob(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    ...options
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Fayl yuklanmadi");
  }

  return response.blob();
}

export const api = {
  getPublicConfig: () => request("/public/app-config"),
  createContactRequest: (payload) =>
    request("/public/contact-requests", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getDevelopersPublic: () => request("/public/developers"),
  getDeveloperPublic: (slug) => request(`/public/developers/${encodeURIComponent(slug)}`),
  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  developerLogin: (payload) =>
    request("/developers/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getDeveloperMe: (token) => request("/developers/me", { token }),
  updateDeveloperMe: (token, payload) =>
    request("/developers/me", {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  studentLogin: (payload) =>
    request("/student-auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  validateStudentRegisterToken: (token) =>
    request(`/student-auth/register/validate?token=${encodeURIComponent(token)}`),
  registerStudent: (payload) =>
    request("/student-auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  requestTelegramCode: (payload) =>
    request("/auth/telegram/request", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  verifyTelegramCode: (payload) =>
    request("/auth/telegram/verify", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  getMeta: (token) => request("/meta", { token }),
  getProfile: (token) => request("/profile", { token }),
  updateProfile: (token, payload) =>
    request("/profile", {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  getReceptionStudents: (token, params = {}) => {
    const query = new URLSearchParams();
    if (params.search) {
      query.set("search", params.search);
    }
    if (params.status) {
      query.set("status", params.status);
    }
    if (params.includeArchived) {
      query.set("includeArchived", "1");
    }
    return request(`/reception/students?${query.toString()}`, { token });
  },
  getReceptionContactRequests: (token) => request("/reception/contact-requests", { token }),
  readReceptionContactRequest: (token, id) =>
    request(`/reception/contact-requests/${id}/read`, {
      method: "POST",
      token
    }),
  createStudent: (token, payload) =>
    request("/reception/students", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  updateStudent: (token, studentId, payload) =>
    request(`/reception/students/${studentId}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  deleteStudent: (token, studentId) =>
    request(`/reception/students/${studentId}`, {
      method: "DELETE",
      token
    }),
  archiveStudent: (token, studentId) =>
    request(`/reception/students/${studentId}/archive`, {
      method: "POST",
      token
    }),
  createStudentRegisterToken: (token, studentId, expiresInSeconds = 90) =>
    request(`/reception/students/${studentId}/register-token`, {
      method: "POST",
      token,
      body: JSON.stringify({ expiresInSeconds })
    }),
  createStudentAccessLink: (token, studentId, nextPath = "/student/profile") =>
    request(`/reception/students/${studentId}/access-link`, {
      method: "POST",
      token,
      body: JSON.stringify({ nextPath })
    }),
  getStudentHistory: (token, studentId) => request(`/reception/students/${studentId}/history`, { token }),
  createPayment: (token, payload) =>
    request("/reception/payments", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  getAllPayments: (token) => request("/reception/payments", { token }),
  getTeacherStudents: (token) => request("/teacher/students", { token }),
  getTeacherAttendanceHistory: (token, range = "month") => request(`/teacher/attendance/history?range=${range}`, { token }),
  saveAttendance: (token, payload) =>
    request("/teacher/attendance", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  getDirectorOverview: (token) => request("/director/overview", { token }),
  getDirectorFinance: (token) => request("/director/finance", { token }),
  getDirectorCourses: (token) => request("/director/courses", { token }),
  createTeacher: (token, payload) =>
    request("/director/teachers", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  updateTeacher: (token, teacherId, payload) =>
    request(`/director/teachers/${teacherId}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  deleteTeacher: (token, teacherId) =>
    request(`/director/teachers/${teacherId}`, {
      method: "DELETE",
      token
    }),
  createCourse: (token, payload) =>
    request("/director/courses", {
      method: "POST",
      token,
      body: JSON.stringify(payload)
    }),
  updateCourse: (token, courseId, payload) =>
    request(`/director/courses/${courseId}`, {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  deleteCourse: (token, courseId) =>
    request(`/director/courses/${courseId}`, {
      method: "DELETE",
      token
    }),
  getNotifications: (token) => request("/notifications", { token }),
  readNotification: (token, notificationId) =>
    request(`/notifications/${notificationId}/read`, {
      method: "POST",
      token
    }),
  getSettings: (token) => request("/settings", { token }),
  saveSettings: (token, payload) =>
    request("/settings", {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    }),
  exportReport: (token, type = "overview", format = "xlsx", filters = {}) => {
    const query = new URLSearchParams({ type, format });
    if (filters.period) query.set("period", filters.period);
    if (filters.from) query.set("from", filters.from);
    if (filters.to) query.set("to", filters.to);
    return requestBlob(`/director/reports/export?${query.toString()}`, { token });
  },
  exportCsvReport: (token, type) => requestFile(`/director/reports/export?type=${type}&format=csv`, { token }),
  getPrintableReport: (token) => requestFile("/director/reports/print", { token }),
  getStudentMe: (token) => request("/student/me", { token }),
  getStudentDashboard: (token) => request("/student/me/dashboard", { token }),
  getStudentAttendance: (token) => request("/student/me/attendance", { token }),
  getStudentPayments: (token) => request("/student/me/payments", { token }),
  getStudentSchedule: (token) => request("/student/me/schedule", { token }),
  getStudentNotifications: (token) => request("/student/me/notifications", { token }),
  getStudentProfile: (token) => request("/student/me/profile", { token }),
  updateStudentPassword: (token, payload) =>
    request("/student/me/profile/password", {
      method: "PUT",
      token,
      body: JSON.stringify(payload)
    })
};
