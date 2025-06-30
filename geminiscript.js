let mode = 'current';

function setMode(selected) {
    mode = selected;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    const resultsContainer = document.getElementById('results');
    resultsContainer.style.opacity = '0';
    setTimeout(() => {
        resultsContainer.innerHTML = '';
        resultsContainer.style.opacity = '1';
    }, 300);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function showLoading(button) {
    const btnText = button.querySelector('.btn-text');
    btnText.innerHTML = '<span class="loading-spinner"></span> Calculating...';
    button.disabled = true;
}

function hideLoading(button, originalText) {
    const btnText = button.querySelector('.btn-text');
    btnText.textContent = originalText;
    button.disabled = false;
}

// PATCH 3: Heavily updated calculateTax function for new flow and detailed display
function calculateTax(payPerAnnual, annualGross, isDoctor, monthlyPay, grossMonthlyPay, monthlyAllowances = []) {
    // Annual NHF is 2.5% of Pay per Annual (base salary), not the gross. Doctors are exempt.
    const H = isDoctor ? 0 : (0.025 * payPerAnnual);
    const monthlyNHF = H / 12;

    let reliefs = 0;
    let taxable = 0;
    let brackets = [];

    if (mode === 'current') {
        // Current law: 20% of annual gross + 200k consolidation + Annual NHF
        reliefs = (0.2 * annualGross) + 200000 + H;
        taxable = Math.max(0, annualGross - reliefs);
        brackets = [
            [300000, 0.07], [300000, 0.11], [500000, 0.15],
            [500000, 0.19], [1600000, 0.21], [Infinity, 0.24]
        ];
    } else {
        // Proposed law: Only 200k consolidation + Annual NHF
        reliefs = 200000 + H;
        taxable = Math.max(0, annualGross - reliefs);
        brackets = [
            [800000, 0.00], [2200000, 0.15], [9000000, 0.18],
            [13000000, 0.21], [25000000, 0.23], [Infinity, 0.25]
        ];
    }

    let remaining = taxable;
    let totalTax = 0;
    let rowsHTML = "";

    for (let [limit, rate] of brackets) {
        if (remaining <= 0) break;
        let taxedAmount = Math.min(remaining, limit);
        let tax = taxedAmount * rate;
        totalTax += tax;

        if (taxedAmount > 0) {
            rowsHTML += `
                <tr>
                    <td>${formatCurrency(taxedAmount)}</td>
                    <td>${(rate * 100).toFixed(1)}%</td>
                    <td>${formatCurrency(tax)}</td>
                </tr>`;
        }
        remaining -= taxedAmount;
    }

    const monthlyTax = totalTax / 12;
    // Net Monthly Pay = Gross Monthly Pay - Monthly Tax - Monthly NHF
    const netMonthly = grossMonthlyPay - monthlyTax - monthlyNHF;
    const effectiveRate = annualGross > 0 ? (totalTax / annualGross) * 100 : 0;

    let allowanceBreakdown = monthlyAllowances
        .map((a, i) => a > 0 ? `<tr><td>Monthly Allowance ${i + 1}</td><td>${formatCurrency(a)}</td></tr>` : '')
        .join('');

    const resultHTML = `
        <div class="person-result">
            <h2>Tax Calculation <span style="font-size: 0.7em; opacity: 0.7;">(${mode === 'current' ? 'Current Law' : 'Proposed Law'})</span></h2>

            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-value">${formatCurrency(payPerAnnual)}</div>
                    <div class="summary-label">Pay per Annual (Base)</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${formatCurrency(annualGross)}</div>
                    <div class="summary-label">Annual Gross</div>
                </div>
                 <div class="summary-item">
                    <div class="summary-value">${formatCurrency(grossMonthlyPay)}</div>
                    <div class="summary-label">Gross Monthly</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${formatCurrency(totalTax)}</div>
                    <div class="summary-label">Annual Tax</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${formatCurrency(monthlyTax)}</div>
                    <div class="summary-label">Monthly Tax</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${formatCurrency(netMonthly)}</div>
                    <div class="summary-label">Net Monthly</div>
                </div>
            </div>

            <table class="table">
                <thead>
                    <tr><th>Income & Relief Details</th><th>Amount</th></tr>
                </thead>
                <tbody>
                    <tr><td>Annual Gross Salary</td><td>${formatCurrency(annualGross)}</td></tr>
                    <tr><td>Gross Monthly Pay</td><td>${formatCurrency(grossMonthlyPay)}</td></tr>
                    <tr style="opacity: 0.7;"><td>Pay per Annual (Base)</td><td>${formatCurrency(payPerAnnual)}</td></tr>
                    <tr style="opacity: 0.7;"><td>Monthly Pay (Base)</td><td>${formatCurrency(monthlyPay)}</td></tr>
                    ${allowanceBreakdown}
                    <tr><td>Total Relief (${mode === 'current' ? '20% + ₦200k + NHF' : '₦200k + NHF'})</td><td>${formatCurrency(reliefs)}</td></tr>
                    <tr style="opacity: 0.7;"><td>- 20% of Gross Relief</td><td>${mode === 'current' ? formatCurrency(0.2 * annualGross) : 'N/A'}</td></tr>
                    <tr style="opacity: 0.7;"><td>- Consolidation Relief</td><td>${formatCurrency(200000)}</td></tr>
                    <tr style="opacity: 0.7;"><td>- Annual NHF (${isDoctor ? 'Exempt' : '2.5% of PA'})</td><td>${formatCurrency(H)}</td></tr>
                    <tr><td>- Monthly NHF Deduction</td><td>${formatCurrency(monthlyNHF)}</td></tr>
                    <tr style="font-weight: bold;"><td>Taxable Income</td><td>${formatCurrency(taxable)}</td></tr>
                    <tr style="font-weight: bold;"><td>Effective Tax Rate</td><td>${effectiveRate.toFixed(2)}%</td></tr>
                </tbody>
            </table>

            ${rowsHTML ? `
                <h3>Tax Bracket Breakdown</h3>
                <table class="table">
                    <thead><tr><th>Taxable Amount</th><th>Rate</th><th>Tax</th></tr></thead>
                    <tbody>
                        ${rowsHTML}
                        <tr style="font-weight: bold; background-color: #f8f9fa;">
                            <td>Total</td><td></td><td>${formatCurrency(totalTax)}</td>
                        </tr>
                    </tbody>
                </table>`
            : ''}
        </div>`;
    return resultHTML;
}

// PATCH 4: New function to handle the combined manual input form
function handleManualInput() {
    const button = document.querySelector('#manual .btn-primary');
    showLoading(button, 'Calculate Tax');

    setTimeout(() => {
        try {
            const payPerAnnual = parseFloat(document.getElementById('payPerAnnual').value) || 0;
            const isDoctor = document.querySelector('input[name="isDoctor"]:checked').value === 'yes';

            if (payPerAnnual <= 0) {
                alert('Please enter your Pay per Annual (Base Salary).');
                hideLoading(button, 'Calculate Tax');
                return;
            }

            // Calculate monthly base pay
            const monthlyPay = payPerAnnual / 12;

            // Collect monthly allowances
            const monthlyAllowances = [];
            document.querySelectorAll('#allowanceContainer input').forEach(input => {
                const value = parseFloat(input.value) || 0;
                monthlyAllowances.push(value);
            });
            const totalMonthlyAllowances = monthlyAllowances.reduce((sum, allowance) => sum + allowance, 0);

            // Calculate gross pays
            const grossMonthlyPay = monthlyPay + totalMonthlyAllowances;
            const annualGross = grossMonthlyPay * 12;

            const result = calculateTax(payPerAnnual, annualGross, isDoctor, monthlyPay, grossMonthlyPay, monthlyAllowances);
            document.getElementById('results').innerHTML = result;
            document.getElementById('results').scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            alert('Error calculating tax: ' + error.message);
        } finally {
            hideLoading(button, 'Calculate Tax');
        }
    }, 500);
}

// PATCH 5: Updated addAllowanceField to specify "Monthly"
function addAllowanceField() {
    const container = document.getElementById('allowanceContainer');
    const allowanceCount = container.children.length + 1;

    const div = document.createElement('div');
    div.className = 'allowance-field-wrapper'; // Use a wrapper for easier removal
    div.innerHTML = `
        <div class="allowance-field">
            <label class="form-label">Monthly Allowance ${allowanceCount} (₦)</label>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="number" class="form-control" placeholder="0" style="flex: 1;">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.closest('.allowance-field-wrapper').remove()">-</button>
            </div>
        </div>
    `;
    container.appendChild(div);
}


// Unchanged: Excel upload functionality
function handleFileUpload() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select an Excel file');
        return;
    }
    const button = document.querySelector('#excel .btn-primary');
    showLoading(button);

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                alert('No data found in Excel file');
                return;
            }

            let results = '';
            jsonData.forEach((row, index) => {
                try {
                    const payPerAnnual = parseFloat(row['Pay per Annual'] || row['pay per annual'] || 0);
                    const gross = parseFloat(row['Annual Gross'] || row['annual gross'] || 0);
                    const isDoctor = String(row['Doctor'] || row['doctor'] || 'no').toLowerCase() === 'yes';

                    if (gross > 0 || payPerAnnual > 0) {
                        const finalGross = gross > 0 ? gross : payPerAnnual; // Excel logic remains simpler
                        results += calculateTax(payPerAnnual, finalGross, isDoctor, finalGross/12, finalGross/12, []);
                    }
                } catch (error) {
                    console.error(`Error processing row ${index + 1}:`, error);
                }
            });

            if (results) {
                document.getElementById('results').innerHTML = results;
                document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
            } else {
                alert('No valid data found. Ensure Excel has "Pay per Annual" or "Annual Gross" columns.');
            }

        } catch (error) {
            alert('Error reading Excel file: ' + error.message);
        } finally {
            hideLoading(button, 'Upload & Calculate');
        }
    };
    reader.readAsArrayBuffer(file);
}