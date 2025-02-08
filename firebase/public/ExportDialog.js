class ExportDialog {
    constructor() {
        console.log('Initializing ExportDialog');
        this.dialog = null;
        this.ordersData = null;
        this.currentFilters = null;
        this.createDialog();
    }

    createDialog() {
        console.log('Creating export dialog HTML');
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

        document.body.insertAdjacentHTML('beforeend', dialogHTML);
        this.dialog = document.getElementById('exportDialog');
        
        if (!this.dialog) {
            console.error('Failed to find export dialog element after creation');
            return;
        }
        
        console.log('Setting up event listeners');
        this.dialog.querySelector('.close-button').addEventListener('click', () => this.hide());
        this.dialog.querySelector('.cancel-button').addEventListener('click', () => this.hide());
        
        const formatButtons = this.dialog.querySelectorAll('.format-button');
        formatButtons.forEach(button => {
            button.addEventListener('click', () => {
                console.log('Format selected:', button.dataset.format);
                formatButtons.forEach(btn => btn.classList.remove('selected'));
                button.classList.add('selected');
            });
        });

        this.dialog.querySelector('.export-button').addEventListener('click', () => {
            const selectedFormat = this.dialog.querySelector('.format-button.selected')?.dataset.format;
            console.log('Export button clicked. Selected format:', selectedFormat);
            if (selectedFormat) {
                this.handleExport(selectedFormat);
            } else {
                console.warn('No export format selected');
                alert('Please select an export format');
            }
        });
    }

    show(currentFilters, ordersData) {
        console.log('Showing export dialog');
        console.log('Current filters:', currentFilters);
        console.log('Orders data length:', ordersData?.length);
        
        this.ordersData = ordersData;
        this.currentFilters = currentFilters;
        
        if (!this.dialog) {
            console.error('Dialog element not found');
            return;
        }
        
        try {
            document.getElementById('dateRangeInfo').textContent = 
                `${currentFilters.startDate || 'All'} to ${currentFilters.endDate || 'All'}`;
            document.getElementById('timeRangeInfo').textContent = 
                `${currentFilters.startTime || 'All'} to ${currentFilters.endTime || 'All'}`;
            document.getElementById('sortByInfo').textContent = this.getSortByText(currentFilters.sortBy);
            document.getElementById('sortOrderInfo').textContent = 
                currentFilters.sortOrder === 'asc' ? 'Ascending' : 'Descending';
        } catch (error) {
            console.error('Error updating filter info:', error);
        }

        this.dialog.style.display = 'flex';
    }

    getSortByText(sortBy) {
        const sortMap = {
            'date': 'Date',
            'dailyCustomerNumber': 'Daily Customer Number',
            'monthlyCustomerNumber': 'Monthly Customer Number',
            'totalAmount': 'Total Amount'
        };
        return sortMap[sortBy] || sortBy;
    }

    hide() {
        console.log('Hiding export dialog');
        if (this.dialog) {
            this.dialog.style.display = 'none';
        }
    }

    formatDateTime(dateStr) {
        console.log('Formatting datetime for:', dateStr);
        try {
            const date = new Date(dateStr);
            return {
                date: date.toLocaleDateString('en-US', {
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric'
                }),
                time: date.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                })
            };
        } catch (error) {
            console.error('Error formatting datetime:', error);
            return { date: 'Invalid Date', time: 'Invalid Time' };
        }
    }

    handleExport(format) {
        console.log('Starting export process for format:', format);
        console.log('Orders data:', this.ordersData);
        
        try {
            if (!Array.isArray(this.ordersData)) {
                console.error('Invalid orders data type:', typeof this.ordersData);
                alert('Error: Invalid orders data');
                return;
            }

            console.log('Processing orders for export');
            const orders = this.ordersData.map(order => {
                console.log('Processing order:', order.dailyCustomerNumber);
                const { date, time } = this.formatDateTime(order.date);
                
                if (!Array.isArray(order.items)) {
                    console.error('Invalid items array for order:', order.dailyCustomerNumber);
                    throw new Error('Invalid items array');
                }

                return {
                    dailyCustomerNumber: order.dailyCustomerNumber,
                    monthlyCustomerNumber: order.monthlyCustomerNumber,
                    date: date,
                    time: time,
                    orderDetails: order.items.map(item => {
                        console.log('Processing item:', item);
                        return `${item.name} x${item.quantity} = PHP ${(item.price * item.quantity).toFixed(2)}`;
                    }).join('\n'),
                    totalAmount: order.totalAmount,
                    discountedTotal: order.discountedTotal || order.totalAmount
                };
            });

            console.log('Processed orders:', orders);

            if (format === 'excel') {
                this.exportToExcel(orders);
            } else {
                this.exportToPDF(orders);
            }
            this.hide();
        } catch (error) {
            console.error('Error in handleExport:', error);
            alert('Error preparing export data: ' + error.message);
        }
    }

    exportToExcel(data) {
        console.log('Starting Excel export');
        try {
            // Check if XLSX is available
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX library not found');
            }
    
            console.log('Formatting data for Excel');
            const formattedData = data.map(order => {
                // Format order details for better Excel display
                const orderDetails = order.orderDetails
                    .split('\n')
                    .map(line => line.replace(/\s+/g, ' ').trim())
                    .join('\n');
    
                return {
                    'Daily #': order.dailyCustomerNumber,
                    'Date': order.date,
                    'Time': order.time,
                    'Order Details': orderDetails,
                    'Monthly #': order.monthlyCustomerNumber,
                    'Total Amount': `PHP ` + `${Number(order.totalAmount).toFixed(2)}`,
                    'Discounted Total': `PHP ` + `${Number(order.discountedTotal).toFixed(2)}`
                };
            });
    
            console.log('Creating Excel worksheet');
            // Create worksheet from data
            const ws = XLSX.utils.json_to_sheet(formattedData);
            
            // Set column widths
            const colWidths = [
                { wch: 10 },  // Daily #
                { wch: 12 },  // Date
                { wch: 12 },  // Time
                { wch: 60 },  // Order Details
                { wch: 10 },  // Monthly #
                { wch: 15 },  // Total Amount
                { wch: 15 }   // Discounted Total
            ];
            ws['!cols'] = colWidths;
    
            // Set row height to accommodate multiple lines in Order Details
            const rowHeights = formattedData.map((_, idx) => ({ hpt: 25 }));
            ws['!rows'] = rowHeights;
    
            // Create workbook and append worksheet
            console.log('Creating workbook');
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Orders");
    
            // Generate filename with current date
            const date = new Date().toISOString().split('T')[0];
            const filename = `orders_export_${date}.xlsx`;
            
            // Write file
            console.log('Saving Excel file:', filename);
            XLSX.writeFile(wb, filename);
            console.log('Excel export completed');
    
            return true;
        } catch (error) {
            console.error('Error in exportToExcel:', error);
            alert('Error exporting to Excel: ' + error.message);
            return false;
        }
    }
    
    exportToPDF(data) {
        console.log('Starting PDF export');
        try {
            const { jsPDF } = window.jspdf;
            if (!jsPDF) {
                throw new Error('jsPDF not found');
            }
    
            console.log('Creating PDF document');
            const doc = new jsPDF({
                orientation: "landscape",
                unit: "mm",
                format: "a4"
            });
    
            const headers = [
                "Daily #",
                "Date",
                "Time",
                "Order Details",
                "Monthly #",
                "Total Amount",
                "Discounted Total"
            ];
    
            console.log('Preparing table data');
            const rows = data.map(order => {
                const orderString = order.orderDetails

                return [
                    order.dailyCustomerNumber,
                    order.date,
                    order.time,
                    orderString,
                    order.monthlyCustomerNumber,
                    `PHP ${Number(order.totalAmount).toFixed(2)}`,
                    `PHP ${Number(order.discountedTotal).toFixed(2)}`
                ];
            });
    
            console.log('Creating PDF table');
            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 10,
                styles: {
                    font: "helvetica",
                    fontStyle: "normal",
                    overflow: 'linebreak',
                    cellPadding: 3,
                    fontSize: 9,
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1,
                    textColor: 0,
                    minCellHeight: 6
                },
                headStyles: {
                    fillColor: [240, 240, 240],
                    textColor: 0,
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'left'
                },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },    // Daily #
                    1: { cellWidth: 22 },                      // Date
                    2: { cellWidth: 22 },                      // Time
                    3: { cellWidth: 90 },                      // Order Details
                    4: { cellWidth: 18, halign: 'center' },    // Monthly #
                    5: { cellWidth: 25, halign: 'right' },     // Total Amount
                    6: { cellWidth: 25, halign: 'right' }      // Discounted Total
                },
                bodyStyles: {
                    halign: 'left'
                },
                alternateRowStyles: {
                    fillColor: [248, 248, 248]
                },
                didParseCell: function(data) {
                    // Handle specific column alignments
                    if (data.column.index === 5 || data.column.index === 6) {
                        data.cell.styles.halign = 'right';
                    }
                },
                willDrawCell: function(data) {
                    // Add padding for order details
                    if (data.column.index === 3) {
                        data.cell.styles.cellPadding = [3, 5, 3, 5];
                    }
                }
            });
    
            const date = new Date().toISOString().split('T')[0];
            const filename = `orders_export_${date}.pdf`;
            
            console.log('Saving PDF file:', filename);
            doc.save(filename);
            console.log('PDF export completed');
        } catch (error) {
            console.error('Error in exportToPDF:', error);
            alert('Error exporting to PDF: ' + error.message);
        }
    }
    
}