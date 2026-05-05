import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import dayjs from "dayjs";
import {
  getDirectorStats,
  getFinanceSummary,
  listAllPayments,
  listStudents,
  listTeachers
} from "./services.js";

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("ru-RU")} UZS`;
}

function statusLabel(status) {
  if (status === "active") return "Faol";
  if (status === "trial") return "Sinovda";
  if (status === "debtor") return "Qarzdor";
  return status || "-";
}

function filterItemsByDate(items, from, to, field = "createdAt") {
  return items.filter((item) => {
    const raw = String(item?.[field] || "").slice(0, 10);
    if (!raw) return true;
    if (from && raw < from) return false;
    if (to && raw > to) return false;
    return true;
  });
}

function buildFilterSubtitle(options = {}) {
  const labels = [];
  if (options.period) {
    const map = { daily: "Kunlik", weekly: "Haftalik", monthly: "Oylik" };
    labels.push(`Kesim: ${map[options.period] || options.period}`);
  }
  if (options.from) labels.push(`Dan: ${options.from}`);
  if (options.to) labels.push(`Gacha: ${options.to}`);
  return labels.length ? labels.join(" · ") : "To'liq hisobot";
}

function autoFitColumns(worksheet) {
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const value = cell.value ? String(cell.value) : "";
      maxLength = Math.max(maxLength, value.length + 2);
    });
    column.width = Math.min(maxLength, 32);
  });
}

function addWorksheetTitle(worksheet, title, subtitle) {
  worksheet.mergeCells("A1:F1");
  worksheet.getCell("A1").value = title;
  worksheet.getCell("A1").font = { size: 18, bold: true, color: { argb: "FF133385" } };
  worksheet.mergeCells("A2:F2");
  worksheet.getCell("A2").value = subtitle;
  worksheet.getCell("A2").font = { size: 11, color: { argb: "FF6B7A90" } };
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF133385" }
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD7E1F1" } },
      left: { style: "thin", color: { argb: "FFD7E1F1" } },
      bottom: { style: "thin", color: { argb: "FFD7E1F1" } },
      right: { style: "thin", color: { argb: "FFD7E1F1" } }
    };
  });
}

function styleBodyRows(worksheet, fromRow) {
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < fromRow) return;
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE8EEF8" } },
        left: { style: "thin", color: { argb: "FFE8EEF8" } },
        bottom: { style: "thin", color: { argb: "FFE8EEF8" } },
        right: { style: "thin", color: { argb: "FFE8EEF8" } }
      };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    });
  });
}

export async function buildDirectorWorkbook(options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Intelligent CRM";
  workbook.created = new Date();
  workbook.modified = new Date();

  const overview = getDirectorStats();
  const finance = getFinanceSummary();
  const students = listStudents({ includeArchived: true });
  const payments = filterItemsByDate(listAllPayments(), options.from, options.to);
  const teachers = listTeachers();
  const subtitle = buildFilterSubtitle(options);

  const summarySheet = workbook.addWorksheet("Umumiy");
  addWorksheetTitle(summarySheet, "Intelligent CRM report", `${dayjs().format("YYYY-MM-DD HH:mm")} · ${subtitle}`);
  summarySheet.addRow([]);
  summarySheet.addRow(["Ko'rsatkich", "Qiymat"]);
  styleHeaderRow(summarySheet.getRow(4));
  [
    ["Oylik tushum", formatMoney(overview.cards.monthlyRevenue)],
    ["Jami o'quvchilar", `${overview.cards.totalStudents} ta`],
    ["Sinovdagilar", `${overview.cards.trialStudentsCount} ta`],
    ["Qarzdorlar", `${overview.cards.debtorsCount} ta`],
    ["Bugungi tushum", formatMoney(finance.totals.todayRevenue)],
    ["Jami tushum", formatMoney(finance.totals.totalRevenue)],
    ["Qarz summasi", formatMoney(finance.debtors.debtAmount)]
  ].forEach((row) => summarySheet.addRow(row));
  summarySheet.addRow([]);
  summarySheet.addRow(["O'qituvchi", "Student", "Davomat %", "Tushum"]);
  styleHeaderRow(summarySheet.getRow(summarySheet.lastRow.number));
  overview.teacherPerformance.slice(0, 8).forEach((teacher) => {
    summarySheet.addRow([
      teacher.fullName,
      teacher.studentsCount,
      `${teacher.attendancePercent}%`,
      formatMoney(teacher.revenue)
    ]);
  });
  styleBodyRows(summarySheet, 5);
  autoFitColumns(summarySheet);

  const studentsSheet = workbook.addWorksheet("O'quvchilar");
  addWorksheetTitle(studentsSheet, "O'quvchilar ro'yxati", "Arxiv bilan birga to'liq CRM bazasi");
  studentsSheet.addRow([]);
  studentsSheet.addRow(["F.I.Sh", "Telefon", "Kurs", "O'qituvchi", "Balans", "Status", "To'lov muddati", "Arxiv"]);
  styleHeaderRow(studentsSheet.getRow(4));
  students.forEach((student) => {
    studentsSheet.addRow([
      student.fullName,
      student.phone || "-",
      student.courseTitle || "-",
      student.teacherName || "-",
      Number(student.balance || 0),
      statusLabel(student.status),
      student.paymentDueDate || "-",
      student.isArchived ? "Ha" : "Yo'q"
    ]);
  });
  studentsSheet.getColumn(5).numFmt = "#,##0";
  styleBodyRows(studentsSheet, 5);
  autoFitColumns(studentsSheet);

  const paymentsSheet = workbook.addWorksheet("To'lovlar");
  addWorksheetTitle(paymentsSheet, "To'lovlar oqimi", `Qabul qilingan tranzaksiyalar · ${subtitle}`);
  paymentsSheet.addRow([]);
  paymentsSheet.addRow(["Sana", "Student", "Telefon", "Kurs", "Miqdor", "Usul", "Qabul qilgan"]);
  styleHeaderRow(paymentsSheet.getRow(4));
  payments.forEach((payment) => {
    paymentsSheet.addRow([
      payment.createdAt,
      payment.studentName,
      payment.studentPhone || "-",
      payment.courseTitle || "-",
      Number(payment.amount || 0),
      payment.method,
      payment.receivedBy || "-"
    ]);
  });
  paymentsSheet.getColumn(5).numFmt = "#,##0";
  styleBodyRows(paymentsSheet, 5);
  autoFitColumns(paymentsSheet);

  const analyticsSheet = workbook.addWorksheet("Analytics");
  addWorksheetTitle(analyticsSheet, "Kurs va o'qituvchi analytics", "Natija, yuklama va tushum kesimi");
  analyticsSheet.addRow([]);
  analyticsSheet.addRow(["Kurs", "Student", "Guruh", "Faol", "Sinov", "Qarzdor", "Tushum", "Samaradorlik"]);
  styleHeaderRow(analyticsSheet.getRow(4));
  overview.courseAnalysis.forEach((course) => {
    analyticsSheet.addRow([
      course.title,
      course.studentsCount,
      course.groupsCount,
      course.activeCount,
      course.trialCount,
      course.debtorsCount,
      Number(course.revenue || 0),
      `${course.efficiency}%`
    ]);
  });
  analyticsSheet.addRow([]);
  analyticsSheet.addRow(["O'qituvchi", "Biriktirilgan kurslar", "Student", "Faol", "Sinov", "Qarzdor", "Davomat", "Tushum"]);
  styleHeaderRow(analyticsSheet.getRow(analyticsSheet.lastRow.number));
  overview.teacherPerformance.forEach((teacher) => {
    const teacherCourses = teachers
      .find((item) => Number(item.id) === Number(teacher.id))
      ?.courseIds?.length || 0;
    analyticsSheet.addRow([
      teacher.fullName,
      teacherCourses,
      teacher.studentsCount,
      teacher.activeStudentsCount,
      teacher.trialStudentsCount,
      teacher.debtorsCount,
      `${teacher.attendancePercent}%`,
      Number(teacher.revenue || 0)
    ]);
  });
  analyticsSheet.getColumn(7).numFmt = "#,##0";
  analyticsSheet.getColumn(8).numFmt = "#,##0";
  styleBodyRows(analyticsSheet, 5);
  autoFitColumns(analyticsSheet);

  return workbook.xlsx.writeBuffer();
}

function drawMetricCard(doc, x, y, width, title, value, note) {
  doc.roundedRect(x, y, width, 76, 12).fillAndStroke("#F8FAFF", "#D7E1F1");
  doc.fillColor("#6B7A90").fontSize(10).text(title.toUpperCase(), x + 14, y + 12, { width: width - 28 });
  doc.fillColor("#133385").font("Helvetica-Bold").fontSize(18).text(value, x + 14, y + 28, { width: width - 28 });
  doc.fillColor("#6B7A90").font("Helvetica").fontSize(10).text(note, x + 14, y + 53, { width: width - 28 });
}

function drawTable(doc, startY, headers, rows, columnWidths) {
  let y = startY;
  const rowHeight = 24;
  const x = 40;

  doc.fillColor("#133385").rect(x, y, columnWidths.reduce((sum, item) => sum + item, 0), rowHeight).fill();
  doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
  let currentX = x;
  headers.forEach((header, index) => {
    doc.text(header, currentX + 6, y + 7, { width: columnWidths[index] - 12 });
    currentX += columnWidths[index];
  });

  y += rowHeight;
  doc.font("Helvetica").fontSize(9);
  rows.forEach((row, rowIndex) => {
    const bg = rowIndex % 2 === 0 ? "#F9FBFF" : "#FFFFFF";
    doc.fillColor(bg).rect(x, y, columnWidths.reduce((sum, item) => sum + item, 0), rowHeight).fill();
    doc.fillColor("#20304D");
    currentX = x;
    row.forEach((value, index) => {
      doc.text(String(value ?? "-"), currentX + 6, y + 7, { width: columnWidths[index] - 12, ellipsis: true });
      currentX += columnWidths[index];
    });
    y += rowHeight;
  });

  return y;
}

export async function buildDirectorPdfReport(options = {}) {
  const overview = getDirectorStats();
  const finance = getFinanceSummary();
  const students = listStudents({ includeArchived: false }).slice(0, 12);
  const filteredPayments = filterItemsByDate(listAllPayments(), options.from, options.to);
  const subtitle = buildFilterSubtitle(options);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fillColor("#133385").font("Helvetica-Bold").fontSize(24).text("Intelligent CRM Report");
  doc.moveDown(0.3);
  doc.fillColor("#6B7A90").font("Helvetica").fontSize(11).text(`Yaratilgan sana: ${dayjs().format("YYYY-MM-DD HH:mm")}`);
  doc.text(subtitle);
  doc.moveDown(1.2);

  drawMetricCard(doc, 40, 92, 122, "Oylik tushum", formatMoney(overview.cards.monthlyRevenue), "Joriy oy ko'rsatkichi");
  drawMetricCard(doc, 172, 92, 122, "Studentlar", `${overview.cards.totalStudents} ta`, "Umumiy aktiv baza");
  drawMetricCard(doc, 304, 92, 122, "Sinovdagilar", `${overview.cards.trialStudentsCount} ta`, "3 kunlik trial holati");
  drawMetricCard(doc, 436, 92, 122, "Qarzdorlar", `${overview.cards.debtorsCount} ta`, "Faol kuzatuv ostida");

  doc.fillColor("#133385").font("Helvetica-Bold").fontSize(15).text("Kurslar analytics'i", 40, 196);
  let nextY = drawTable(
    doc,
    220,
    ["Kurs", "Student", "Guruh", "Tushum", "Samaradorlik"],
    overview.courseAnalysis.slice(0, 6).map((course) => [
      course.title,
      `${course.studentsCount} ta`,
      `${course.groupsCount} ta`,
      formatMoney(course.revenue),
      `${course.efficiency}%`
    ]),
    [190, 70, 70, 110, 80]
  );

  nextY += 18;
  doc.fillColor("#133385").font("Helvetica-Bold").fontSize(15).text("Top o'qituvchilar", 40, nextY);
  nextY = drawTable(
    doc,
    nextY + 24,
    ["O'qituvchi", "Student", "Davomat", "Tushum"],
    overview.teacherPerformance.slice(0, 6).map((teacher) => [
      teacher.fullName,
      `${teacher.studentsCount} ta`,
      `${teacher.attendancePercent}%`,
      formatMoney(teacher.revenue)
    ]),
    [240, 90, 90, 100]
  );

  doc.addPage();
  doc.fillColor("#133385").font("Helvetica-Bold").fontSize(18).text("Moliyaviy kesim");
  doc.moveDown(0.5);
  doc.fillColor("#20304D").font("Helvetica").fontSize(11);
  doc.text(`Jami tushum: ${formatMoney(finance.totals.totalRevenue)}`);
  doc.text(`Bugungi tushum: ${formatMoney(finance.totals.todayRevenue)}`);
  doc.text(`Qarz summasi: ${formatMoney(finance.debtors.debtAmount)}`);
  doc.text(`Qarzdorlar soni: ${finance.debtors.debtorsCount} ta`);

  doc.moveDown(1.1);
  doc.fillColor("#133385").font("Helvetica-Bold").fontSize(15).text("To'lov usullari");
  drawTable(
    doc,
    doc.y + 10,
    ["Usul", "Tranzaksiya", "Tushum"],
    Object.values(filteredPayments.reduce((acc, payment) => {
      const key = payment.method || "Noma'lum";
      if (!acc[key]) acc[key] = { method: key, count: 0, amount: 0 };
      acc[key].count += 1;
      acc[key].amount += Number(payment.amount || 0);
      return acc;
    }, {})).map((item) => [item.method, `${item.count} ta`, formatMoney(item.amount)]),
    [180, 120, 180]
  );

  doc.moveDown(13);
  doc.fillColor("#133385").font("Helvetica-Bold").fontSize(15).text("Oxirgi studentlar holati");
  drawTable(
    doc,
    doc.y + 10,
    ["F.I.Sh", "Kurs", "Balans", "Status"],
    students.map((student) => [
      student.fullName,
      student.courseTitle || "-",
      formatMoney(student.balance),
      statusLabel(student.status)
    ]),
    [190, 170, 90, 90]
  );

  doc.end();
  return done;
}
