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
                        return `${item.name} x${item.quantity} = ₱${(item.price * item.quantity).toFixed(2)}`;
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
            console.log('Formatting data for Excel');
            const formattedData = data.map(order => ({
                'Daily #': order.dailyCustomerNumber,
                'Monthly #': order.monthlyCustomerNumber,
                'Date': order.date,
                'Time': order.time,
                'Order Details': order.orderDetails,
                'Total Amount': `₱${Number(order.totalAmount).toFixed(2)}`,
                'Discounted Total': `₱${Number(order.discountedTotal).toFixed(2)}`
            }));

            console.log('Creating Excel worksheet');
            const ws = XLSX.utils.json_to_sheet(formattedData);
            
            ws['!cols'] = [
                { wch: 10 },  // Daily #
                { wch: 10 },  // Monthly #
                { wch: 12 },  // Date
                { wch: 12 },  // Time
                { wch: 60 },  // Order Details
                { wch: 15 },  // Total Amount
                { wch: 15 }   // Discounted Total
            ];

            console.log('Creating workbook');
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Orders");

            const date = new Date().toISOString().split('T')[0];
            const filename = `orders_export_${date}.xlsx`;
            
            console.log('Saving Excel file:', filename);
            XLSX.writeFile(wb, filename);
            console.log('Excel export completed');
        } catch (error) {
            console.error('Error in exportToExcel:', error);
            alert('Error exporting to Excel: ' + error.message);
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

            doc.setFontSize(16);
            doc.text("Orders Report", 14, 15);

            const headers = [
                "Daily #",
                "Monthly #",
                "Date",
                "Time",
                "Order Details",
                "Total Amount",
                "Discounted Total"
            ];

            console.log('Preparing table data');
            const rows = data.map(order => [
                order.dailyCustomerNumber,
                order.monthlyCustomerNumber,
                order.date,
                order.time,
                order.orderDetails,
                `₱${Number(order.totalAmount).toFixed(2)}`,
                `₱${Number(order.discountedTotal).toFixed(2)}`
            ]);

            console.log('Creating PDF table');
            doc.autoTable({
                head: [headers],
                body: rows,
                startY: 25,
                styles: {
                    overflow: 'linebreak',
                    cellPadding: 2,
                    fontSize: 8,
                    lineColor: 40,
                    lineWidth: 0.1,
                },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 15 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 'auto' },
                    5: { cellWidth: 25 },
                    6: { cellWidth: 25 }
                },
                theme: 'grid',
                didParseCell: function(data) {
                    if (data.row.index === 0) {
                        data.cell.styles.fontStyle = 'bold';
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