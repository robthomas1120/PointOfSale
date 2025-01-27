class ExportDialog {
  constructor() {
    this.dialog = null;
    this.ordersData = null;
    this.createDialog();
  }

  createDialog() {
    // Create the dialog HTML
    const dialogHTML = `
            <div id="exportDialog" class="modal-overlay" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Export Orders</h2>
                        <button class="close-button">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="filter-info">
                            <h4>Current Filters</h4>
                            <div class="filter-details">
                                <p>Date Range: <span id="dateRangeInfo"></span></p>
                                <p>Time Range: <span id="timeRangeInfo"></span></p>
                                <p>Sort By: <span id="sortByInfo"></span></p>
                                <p>Sort Order: <span id="sortOrderInfo"></span></p>
                            </div>
                        </div>
                        <div class="export-options">
                            <h4>Export Format</h4>
                            <div class="format-buttons">
                                <button class="format-button" data-format="excel">
                                    <i class="format-icon">📊</i>
                                    <span>Excel</span>
                                </button>
                                <button class="format-button" data-format="pdf">
                                    <i class="format-icon">📄</i>
                                    <span>PDF</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="cancel-button">Cancel</button>
                        <button class="export-button">Export</button>
                    </div>
                </div>
            </div>
        `;

    // Add the dialog to the document
    document.body.insertAdjacentHTML("beforeend", dialogHTML);

    // Get dialog element
    this.dialog = document.getElementById("exportDialog");

    // Add event listeners
    this.dialog
      .querySelector(".close-button")
      .addEventListener("click", () => this.hide());
    this.dialog
      .querySelector(".cancel-button")
      .addEventListener("click", () => this.hide());

    const formatButtons = this.dialog.querySelectorAll(".format-button");
    formatButtons.forEach((button) => {
      button.addEventListener("click", () => {
        formatButtons.forEach((btn) => btn.classList.remove("selected"));
        button.classList.add("selected");
      });
    });

    this.dialog
      .querySelector(".export-button")
      .addEventListener("click", () => {
        const selectedFormat = this.dialog.querySelector(
          ".format-button.selected"
        )?.dataset.format;
        if (selectedFormat) {
          this.handleExport(selectedFormat);
        }
      });
  }

  show(currentFilters, ordersData) {
    // Add ordersData parameter
    this.ordersData = ordersData; // Store the orders data

    // Update filter information
    document.getElementById("dateRangeInfo").textContent = `${
      currentFilters.startDate || "All"
    } to ${currentFilters.endDate || "All"}`;
    document.getElementById("timeRangeInfo").textContent = `${
      currentFilters.startTime || "All"
    } to ${currentFilters.endTime || "All"}`;
    document.getElementById("sortByInfo").textContent = currentFilters.sortBy;
    document.getElementById("sortOrderInfo").textContent =
      currentFilters.sortOrder;

    this.dialog.style.display = "flex";
  }

  hide() {
    this.dialog.style.display = "none";
  }

  formatDate(date) {
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }

  formatTime(date) {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  handleExport(format) {
    const orders = this.ordersData.map((order) => ({
      dailyCustomerNumber: order.dailyCustomerNumber,
      monthlyCustomerNumber: order.monthlyCustomerNumber,
      date: this.formatDate(order.date),
      time: this.formatTime(order.date),
      orderDetails: order.items
        .map(
          (item) =>
            // Format each item line
            `${item.name} x${item.quantity} = P${(
              item.price * item.quantity
            ).toFixed(2)}`
        )
        .join("\n"), // Changed to \n for direct line breaks
      totalAmount: order.totalAmount.toFixed(2),
    }));

    if (format === "excel") {
      this.exportToExcel(orders);
    } else {
      this.exportToPDF(orders);
    }
    this.hide();
  }

  exportToExcel(data) {
    // Transform the data (keep Total Amount as numbers)
    const formattedData = data.map((order) => ({
      "Daily #": order.dailyCustomerNumber,
      Date: order.date,
      Time: order.time,
      "Order Details": order.orderDetails,
      "Total Amount": Number(order.totalAmount), // Keep as number
      "Monthly #": order.monthlyCustomerNumber,
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);

    // Set column widths
    const cols = [
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 60 },
      { wch: 15 },
      { wch: 10 }, // Total Amount column width
    ];
    ws["!cols"] = cols;

    // Apply custom number format for Total Amount (column index 4)
    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let R = 1; R <= range.e.r; R++) {
      // Start at row 1 (skip header)
      const cellAddress = XLSX.utils.encode_cell({ c: 4, r: R }); // Column E (index 4)
      if (ws[cellAddress]) {
        ws[cellAddress].z = '"₱"#,##0.00'; // Excel custom format
        ws[cellAddress].t = "n"; // Ensure cell type is number
      }
    }

    // Style all cells
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cellAddress]) continue;

        ws[cellAddress].s = {
          alignment: {
            vertical: "top",
            horizontal: C === 4 ? "right" : "left", // Right-align currency
            wrapText: true,
          },
        };
      }
    }

    // Style header row
    for (let C = range.s.c; C <= range.e.c; C++) {
      const headerAddress = XLSX.utils.encode_cell({ c: C, r: 0 });
      ws[headerAddress].s = {
        font: { bold: true },
        alignment: { vertical: "center", horizontal: "center" },
        fill: { fgColor: { rgb: "EEEEEE" } },
      };
    }

    // Create workbook and save
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const filename = `orders_export_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  exportToPDF(data) {
    // Create new jsPDF instance in landscape mode
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
    });

    // Add title
    doc.setFontSize(16);
    doc.text("Orders Export", 14, 15);
    doc.setFontSize(10);

    // Add filter information
    const startDate = document.getElementById("startDate").value || "All dates";
    const endDate = document.getElementById("endDate").value || "All dates";
    doc.text(`Date Range: ${startDate} to ${endDate}`, 14, 25);

    // Transform the data to put each item on a new line
    const transformedData = data.map((order) => {
      return [
        order.dailyCustomerNumber,
        order.date,
        order.time,
        order.orderDetails, // Already formatted with line breaks
        order.totalAmount,
        order.monthlyCustomerNumber,
      ];
    });

    // Define headers
    const headers = [
      "Daily #",
      "Date",
      "Time",
      "Order Details",
      "Total Amount",
      "Monthly #",
    ];

    // Configure and create table
    doc.autoTable({
      head: [headers],
      body: transformedData,
      startY: 30,
      styles: {
        overflow: "linebreak",
        cellPadding: 2,
        fontSize: 8,
        lineColor: 40,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 20 }, // Daily #
        1: { cellWidth: 30 }, // Date
        2: { cellWidth: 30 }, // Time
        3: { cellWidth: "auto" }, // Order Details
        4: { cellWidth: 30 }, // Total Amount
        5: { cellWidth: 20 }, // Monthly #
      },
      theme: "grid",
    });

    // Generate filename with current date
    const date = new Date().toISOString().split("T")[0];
    const filename = `orders_export_${date}.pdf`;

    doc.save(filename);
  }
}
