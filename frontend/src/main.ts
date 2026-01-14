import "./styles.css";

import * as z from "zod";

import Chart from "chart.js/auto";
import { utils, writeFile } from "xlsx";

import { Hydrant, HydrantDisplay } from "./Hydrant.ts";

let rawData: HydrantDisplay[] = [];
let chart: Chart<"bar", number[], string> | null = null;
let currentPage = 1;
const rowsPerPage = 8;

// Fetch hydrants
async function fetchHydrants() {
  try {
    const res = await fetch("http://localhost:5001/api/hydrants");
    const data: z.infer<typeof Hydrant>[] = await res.json();
    rawData = data.map((d, i: number) => ({
      id: d.id,
      srNo: i + 1,
      hydrant: d.hydrant,
      location: d.location,
      date: new Date(d.inspection_date),
      defects: d.defects || "",
      checkedBy: d.checked_by,
    }));
    renderDashboard();
  } catch (err) {
    console.error("Failed to fetch hydrants:", err);
  }
}

function renderDashboard() {
  updateSummaryCards();
  updateTable();
  if (
    !(
      document.getElementById("chartCard") as HTMLDivElement
    ).classList.contains("hidden")
  )
    updateChart();
}

// Summary Cards
function updateSummaryCards() {
  const total: number = rawData.length;
  const defective: number = rawData.filter((d) => d.defects).length;
  const checked: number = rawData.filter((d) => d.checkedBy).length;
  const rate = total ? Math.round((checked / total) * 100) : 0;
  (
    document.getElementById("totalHydrants") as HTMLParagraphElement
  ).textContent = String(total);
  (
    document.getElementById("defectiveHydrants") as HTMLParagraphElement
  ).textContent = String(defective);
  (
    document.getElementById("checkedHydrants") as HTMLParagraphElement
  ).textContent = String(checked);
  (
    document.getElementById("completionRate") as HTMLParagraphElement
  ).textContent = rate + "%";
}

// Table & Pagination
function updateTable() {
  const tbody = document.querySelector(
    "#hydrantTable tbody",
  ) as HTMLTableSectionElement;
  const thead = document.querySelector(
    "#hydrantTable thead",
  ) as HTMLTableSectionElement;
  thead.innerHTML =
    "<tr>" +
    ["Sr No", "Hydrant", "Location", "Date", "Defects", "Checked By", "Actions"]
      .map((h) => `<th class='border p-2'>${h}</th>`)
      .join("") +
    "</tr>";
  tbody.innerHTML = "";
  const start = (currentPage - 1) * rowsPerPage;
  const pageData = rawData.slice(start, start + rowsPerPage);
  pageData.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
          <td class="border p-2">${d.srNo}</td>
          <td class="border p-2">${d.hydrant}</td>
          <td class="border p-2">${d.location}</td>
          <td class="border p-2">${d.date.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
          <td class="border p-2">${d.defects}</td>
          <td class="border p-2">${d.checkedBy}</td>
          <td class="border p-2 flex gap-2">
            <button class="px-2 py-1 bg-yellow-500 text-white rounded editBtn" data-id="${d.id}">Edit</button>
            <button class="px-2 py-1 bg-red-600 text-white rounded deleteBtn" data-id="${d.id}">Delete</button>
          </td>
        `;
    tbody.appendChild(tr);
  });
  updatePagination();
  attachRowButtons();
}

function updatePagination() {
  const totalPages = Math.ceil(rawData.length / rowsPerPage) || 1;
  const container = document.getElementById("pagination") as HTMLDivElement;
  container.innerHTML = "";
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = String(i);
    btn.className = `px-3 py-1 rounded ${i === currentPage ? "bg-blue-500 text-white" : "bg-gray-200"}`;
    btn.onclick = () => {
      currentPage = i;
      updateTable();
    };
    container.appendChild(btn);
  }
}

function attachRowButtons() {
  (
    document.querySelectorAll(".deleteBtn") as NodeListOf<HTMLButtonElement>
  ).forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("Delete this hydrant?")) {
        await fetch(`http://localhost:5001/api/hydrants/${id}`, {
          method: "DELETE",
        });
        await fetchHydrants();
      }
    });
  });
  (
    document.querySelectorAll(".editBtn") as NodeListOf<HTMLButtonElement>
  ).forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.dataset.id);
      const h: HydrantDisplay | undefined = rawData.find((x) => x.id == id);
      if (h === undefined) return;
      (document.getElementById("editId") as HTMLInputElement).value =
        String(id);
      (document.getElementById("editHydrantName") as HTMLInputElement).value =
        h.hydrant;
      (document.getElementById("editLocation") as HTMLInputElement).value =
        h.location;
      (
        document.getElementById("editInspectionDate") as HTMLInputElement
      ).value = h.date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      (document.getElementById("editDefects") as HTMLInputElement).value =
        h.defects !== null ? h.defects : "";
      (document.getElementById("editCheckedBy") as HTMLInputElement).value =
        h.checkedBy;
      (document.getElementById("editModal") as HTMLDivElement).style.display =
        "flex";
    });
  });
}

// Chart
function updateChart() {
  const counts: Record<string, number> = {};
  rawData.forEach((d) => {
    const k: string = d.location;
    counts[k] = counts[k] ? counts[k] + (d.defects ? 1 : 0) : d.defects ? 1 : 0;
  });
  const labels = Object.keys(counts);
  const values = Object.values(counts);
  const ctx = (
    document.getElementById("defectChart") as HTMLCanvasElement
  ).getContext("2d") as CanvasRenderingContext2D;
  if (chart !== null) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{ label: "Defective Hydrants by Location", data: values }],
    },
    options: { responsive: true },
  });
}

// Search
(document.getElementById("searchBar") as HTMLInputElement).addEventListener(
  "input",
  function () {
    const q = this.value.toLowerCase();
    if (!q) {
      renderDashboard();
      return;
    }
    const filtered = rawData.filter(
      (d) =>
        (d.hydrant || "").toLowerCase().includes(q) ||
        (d.location || "").toLowerCase().includes(q) ||
        (d.defects || "").toLowerCase().includes(q) ||
        (d.checkedBy || "").toLowerCase().includes(q),
    );
    // show filtered without changing rawData
    const old = [...rawData];
    rawData = filtered.map((x, i) => ({ ...x, srNo: i + 1 }));
    currentPage = 1;
    updateTable();
    rawData = old;
  },
);

// Export
(document.getElementById("exportBtn") as HTMLButtonElement).addEventListener(
  "click",
  () => {
    const ws = utils.json_to_sheet(rawData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Hydrants");
    writeFile(wb, "hydrants.xlsx");
  },
);

// Toggle Chart
(
  document.getElementById("toggleChartBtn") as HTMLButtonElement
).addEventListener("click", () => {
  const card = document.getElementById("chartCard") as HTMLDivElement;
  card.classList.toggle("hidden");
  if (!card.classList.contains("hidden")) updateChart();
});

// Add
(document.getElementById("entryForm") as HTMLFormElement).addEventListener(
  "submit",
  async function (e) {
    e.preventDefault();
    const payload = {
      hydrant:
        (document.getElementById("hydrantName") as HTMLInputElement).value ||
        null,
      location:
        (document.getElementById("location") as HTMLInputElement).value || null,
      inspection_date:
        (document.getElementById("inspectionDate") as HTMLInputElement).value ||
        null,
      defects:
        (document.getElementById("defects") as HTMLInputElement).value || null,
      checked_by:
        (document.getElementById("checkedBy") as HTMLInputElement).value ||
        null,
    };
    await fetch("http://localhost:5001/api/hydrants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    (document.getElementById("entryModal") as HTMLDivElement).style.display =
      "none";
    this.reset();
    await fetchHydrants();
  },
);

// Edit
(document.getElementById("editForm") as HTMLFormElement).addEventListener(
  "submit",
  async function (e) {
    e.preventDefault();
    const id = (document.getElementById("editId") as HTMLInputElement).value;
    const payload = {
      hydrant:
        (document.getElementById("editHydrantName") as HTMLInputElement)
          .value || null,
      location:
        (document.getElementById("editLocation") as HTMLInputElement).value ||
        null,
      inspection_date:
        (document.getElementById("editInspectionDate") as HTMLInputElement)
          .value || null,
      defects:
        (document.getElementById("editDefects") as HTMLInputElement).value ||
        null,
      checked_by:
        (document.getElementById("editCheckedBy") as HTMLInputElement).value ||
        null,
    };
    await fetch(`http://localhost:5001/api/hydrants/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    (document.getElementById("editModal") as HTMLDivElement).style.display =
      "none";
    await fetchHydrants();
  },
);

// Modal toggles
(document.getElementById("openModal") as HTMLButtonElement).addEventListener(
  "click",
  () =>
    ((document.getElementById("entryModal") as HTMLDivElement).style.display =
      "flex"),
);
(document.getElementById("closeModal") as HTMLButtonElement).addEventListener(
  "click",
  () =>
    ((document.getElementById("entryModal") as HTMLDivElement).style.display =
      "none"),
);
(
  document.getElementById("closeEditModal") as HTMLButtonElement
).addEventListener(
  "click",
  () =>
    ((document.getElementById("editModal") as HTMLDivElement).style.display =
      "none"),
);

// initial load
fetchHydrants();
