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
        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        
        // Get dialog element
        this.dialog = document.getElementById('exportDialog');
        
        // Add event listeners
        this.dialog.querySelector('.close-button').addEventListener('click', () => this.hide());
        this.dialog.querySelector('.cancel-button').addEventListener('click', () => this.hide());
        
        const formatButtons = this.dialog.querySelectorAll('.format-button');
        formatButtons.forEach(button => {
            button.addEventListener('click', () => {
                formatButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
            });
        });

        this.dialog.querySelector('.export-button').addEventListener('click', () => {
            const selectedFormat = this.dialog.querySelector('.format-button.selected')?.dataset.format;
            if (selectedFormat) {
                this.handleExport(selectedFormat);
            }
        });
    }

    show(currentFilters, ordersData) {  // Add ordersData parameter
        this.ordersData = ordersData;  // Store the orders data
        
        // Update filter information
        document.getElementById('dateRangeInfo').textContent = 
            `${currentFilters.startDate || 'All'} to ${currentFilters.endDate || 'All'}`;
        document.getElementById('timeRangeInfo').textContent = 
            `${currentFilters.startTime || 'All'} to ${currentFilters.endTime || 'All'}`;
        document.getElementById('sortByInfo').textContent = currentFilters.sortBy;
        document.getElementById('sortOrderInfo').textContent = currentFilters.sortOrder;

        this.dialog.style.display = 'flex';
    }

    hide() {
        this.dialog.style.display = 'none';
    }

    formatDate(date) {
        const d = new Date(date);
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const year = d.getFullYear();
        return `${month}/${day}/${year}`;
    }

    formatTime(date) {
        const d = new Date(date);
        return d.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }

    handleExport(format) {
        const orders = this.ordersData.map(order => ({
            dailyCustomerNumber: order.dailyCustomerNumber,
            monthlyCustomerNumber: order.monthlyCustomerNumber,
            date: this.formatDate(order.date),
            time: this.formatTime(order.date),
            orderDetails: order.items.map(item => 
                `${item.name} x${item.quantity} = ₱${(item.price * item.quantity).toFixed(2)}`
            ).join('\n'),
            totalAmount: order.totalAmount,
            discountedTotal: order.discountedTotal
        }));
    
        if (format === 'excel') {
            this.exportToExcel(orders);
        } else {
            this.exportToPDF(orders);
        }
        this.hide();
    }
    

    exportToExcel(data) {
        console.log(data);

        // Transform the data to make it more presentable in Excel
        const formattedData = data.map(order => ({
            'Daily #': order.dailyCustomerNumber,
            'Date': order.date,
            'Time': order.time,
            'Order Details': order.orderDetails.replace(/\s+/g, ' ').trim(),  // Fix spacing
            'Original Total': `₱${parseFloat(order.totalAmount).toFixed(2)}`,
            'Discounted Total': `₱${parseFloat(order.discountedTotal).toFixed(2)}`,
            'Monthly #': order.monthlyCustomerNumber
        }));
    
        const ws = XLSX.utils.json_to_sheet(formattedData);
        
        // Set column widths
        const cols = [
            { wch: 10 },  // Daily #
            { wch: 12 },  // Date
            { wch: 12 },  // Time
            { wch: 60 },  // Order Details
            { wch: 15 },  // Original Total
            { wch: 15 },  // Discounted Total
            { wch: 10 }   // Monthly #
        ];
        ws['!cols'] = cols;
    
        // Enable text wrapping and set alignment for all cells
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                if (!ws[cell_ref]) continue;
                
                // Add cell formatting
                ws[cell_ref].s = {
                    alignment: {
                        vertical: 'top',
                        horizontal: 'left',
                        wrapText: true
                    }
                };
            }
        }
    
        // Create and style the header row
        const header_range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = header_range.s.c; C <= header_range.e.c; C++) {
            const header_address = { c: C, r: 0 };
            const header_ref = XLSX.utils.encode_cell(header_address);
            ws[header_ref].s = {
                font: {
                    bold: true
                },
                alignment: {
                    vertical: 'center',
                    horizontal: 'center',
                    wrapText: true
                },
                fill: {
                    fgColor: { rgb: "EEEEEE" }
                }
            };
        }
    
        // Adjust row heights (make them taller to accommodate multiple lines)
        const rows = [];
        for (let i = 0; i <= range.e.r; i++) {
            rows.push({ hpt: 45 }); // Increased row height to accommodate multiple lines
        }
        ws['!rows'] = rows;
    
        const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `orders_export_${date}.xlsx`;
    
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
            order.discountedTotal, // Added discounted total
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
          "Discounted Total", // Added header for discounted total
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
            5: { cellWidth: 30 }, // Discounted Total
            6: { cellWidth: 20 }, // Monthly #
          },
          theme: "grid",
        });
        // Generate filename with current date
        const date = new Date().toISOString().split("T")[0];
        const filename = `orders_export_${date}.pdf`;
        doc.save(filename);
      }
}