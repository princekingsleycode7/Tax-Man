let mode = 'current';

function setMode(selected) {
    mode = selected;

    // Update button states with animation
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Clear results with fade out effect
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

// PATCH 4: Updated calculateTax function with corrected PA calculation and doctor NHF logic
function calculateTax(payPerAnnual, gross, isDoctor = false, base = 0, allowances = []) {
    // Use payPerAnnual if provided, otherwise fall back to gross salary
    const PA = payPerAnnual && payPerAnnual > 0 ? payPerAnnual : gross;

    // Skip NHF for doctors (H = 0), otherwise calculate 2.5% of Pay per Annual
    const H = isDoctor ? 0 : (0.025 * PA);

    // Calculate monthly NHF for display purposes
    const monthlyNHF = H / 12;

    let reliefs = 0;
    let taxable = 0;
    let brackets = [];

    if (mode === 'current') {
        // Current law: 20% relief + 200k consolidation + NHF
        reliefs = (0.2 * gross) + 200000 + H;
        taxable = Math.max(0, gross - reliefs);
        brackets = [
            [300000,
                0.07],
            [300000,
                0.11],
            [500000,
                0.15],
            [500000,
                0.19],
            [1600000,
                0.21],
            [Infinity,
                0.24]
        ];
    } else {
        // Proposed law: Only 200k consolidation + NHF (no 20% relief)
        reliefs = 200000 + H;
        taxable = Math.max(0, gross - reliefs);
        brackets = [
            [800000,
                0.00],
            [2200000,
                0.15],
            [9000000,
                0.18],
            [13000000,
                0.21],
            [25000000,
                0.23],
            [Infinity,
                0.25]
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
                    </tr>
                    `;
        }
        remaining -= taxedAmount;
    }

    const monthlyTax = totalTax / 12;
    const netMonthly = (gross / 12) - monthlyTax;
    const effectiveRate = gross > 0 ? (totalTax / gross) * 100 : 0;

    let allowanceBreakdown = allowances
        .map((a, i) => a > 0 ? `<tr><td>Allowance ${i + 1}</td><td>${formatCurrency(a)}</td></tr>` : '')
        .join('');

    // PATCH 5: Updated result HTML to show Pay per Annual and monthly NHF
    const resultHTML = `
            <div class="person-result">
            <h2>Tax Calculation <span style="font-size: 0.7em; opacity: 0.7;">(${mode === 'current' ? 'Current Law' : 'Proposed Law'})</span></h2>

            <div class="summary-grid">
            <div class="summary-item">
            <div class="summary-value">${formatCurrency(PA)}</div>
            <div class="summary-label">Pay per Annual</div>
            </div>
            <div class="summary-item">
            <div class="summary-value">${formatCurrency(gross)}</div>
            <div class="summary-label">Annual Gross</div>
            </div>
            <div class="summary-item">
            <div class="summary-value">${formatCurrency(monthlyNHF)}</div>
            <div class="summary-label">NHF per Month</div>
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
            <tr>
            <th>Income Details</th>
            <th>Amount</th>
            </tr>
            </thead>
            <tbody>
            <tr><td>Annual Gross Salary</td><td>${formatCurrency(gross)}</td></tr>
            <tr><td>Pay per Annual (PA)</td><td>${formatCurrency(PA)}</td></tr>
            ${base > 0 ? `<tr><td>Base Monthly Salary</td><td>${formatCurrency(base)}</td></tr>` : ''}
            ${allowanceBreakdown}
            <tr><td>Total Relief (${mode === 'current' ? '20% + ₦200k + NHF' : '₦200k + NHF'})</td><td>${formatCurrency(reliefs)}</td></tr>
            <tr><td>- 20% Relief</td><td>${mode === 'current' ? formatCurrency(0.2 * gross) : 'N/A'}</td></tr>
            <tr><td>- Consolidation Relief</td><td>${formatCurrency(200000)}</td></tr>
            <tr><td>- NHF (${isDoctor ? 'Exempt - Doctor' : '2.5% of PA'})</td><td>${formatCurrency(H)}</td></tr>
            <tr><td>- NHF per Month</td><td>${formatCurrency(monthlyNHF)}</td></tr>
            <tr style="font-weight: bold;"><td>Taxable Income</td><td>${formatCurrency(taxable)}</td></tr>
            <tr style="font-weight: bold;"><td>Effective Tax Rate</td><td>${effectiveRate.toFixed(2)}%</td></tr>
            </tbody>
            </table>

            ${rowsHTML ? `
            <h3>Tax Bracket Breakdown</h3>
            <table class="table">
            <thead>
            <tr>
            <th>Taxable Amount</th>
            <th>Rate</th>
            <th>Tax</th>
            </tr>
            </thead>
            <tbody>
            ${rowsHTML}
            <tr style="font-weight: bold; background-color: #f8f9fa;">
            <td>Total</td>
            <td></td>
            <td>${formatCurrency(totalTax)}</td>
            </tr>
            </tbody>
            </table>
            `: ''}
            </div>
            `;

    return resultHTML;
}

// PATCH 6: Updated handleAnnualInput to use correct variables and doctor selection
function handleAnnualInput() {
    const button = document.querySelector('#annual .btn-primary');
    showLoading(button);

    setTimeout(() => {
        try {
            const payPerAnnual = parseFloat(document.getElementById('annualPayPerAnnual').value) || 0;
            const gross = parseFloat(document.getElementById('annualGross').value) || 0;
            const isDoctor = document.querySelector('input[name="annualDoctor"]:checked').value === 'yes';

            if (gross <= 0 && payPerAnnual <= 0) {
                alert('Please enter either Pay per Annual or Annual Gross Salary');
                return;
            }

            // Use gross if provided, otherwise use payPerAnnual * 12 as a fallback
            const finalGross = gross > 0 ? gross : payPerAnnual;

            const result = calculateTax(payPerAnnual, finalGross, isDoctor);
            document.getElementById('results').innerHTML = result;
            document.getElementById('results').scrollIntoView({
                behavior: 'smooth'
            });
        } catch (error) {
            alert('Error calculating tax: ' + error.message);
        } finally {
            hideLoading(button, 'Calculate Tax');
        }
    },
        500);
}

// PATCH 7: Updated handleMonthlyInput to use correct variables and doctor selection
// Update the handleMonthlyInput function
function handleMonthlyInput() {
    const button = document.querySelector('#monthly .btn-primary');
    showLoading(button);

    setTimeout(() => {
        try {
            const annualPay = parseFloat(document.getElementById('monthlyPayPerAnnual').value) || 0;
            const isDoctor = document.querySelector('input[name="monthlyDoctor"]:checked').value === 'yes';

            if (annualPay <= 0) {
                alert('Please enter your Annual Pay');
                hideLoading(button, 'Calculate Tax');
                return;
            }

            // Collect annual allowances
            const allowances = [];
            document.querySelectorAll('#allowanceContainer input').forEach(input => {
                const value = parseFloat(input.value) || 0;
                allowances.push(value);
            });

            // Calculate annual gross (annual pay + sum of allowances)
            const totalAnnualAllowances = allowances.reduce((sum, allowance) => sum + allowance, 0);
            const annualGross = annualPay + totalAnnualAllowances;

            const result = calculateTax(annualPay, annualGross, isDoctor, 0, allowances);
            document.getElementById('results').innerHTML = result;
            document.getElementById('results').scrollIntoView({
                behavior: 'smooth'
            });
        } catch (error) {
            alert('Error calculating tax: ' + error.message);
        } finally {
            hideLoading(button, 'Calculate Tax');
        }
    }, 500);
}

// Update the addAllowanceField function
function addAllowanceField() {
    const container = document.getElementById('allowanceContainer');
    const allowanceCount = container.children.length + 1;

    const div = document.createElement('div');
    div.innerHTML = `
        <div class="allowance-field">
            <label class="form-label">Annual Allowance ${allowanceCount} (₦)</label>
            <div style="display: flex; gap: 10px; align-items: center;">
                <input type="number" class="form-control" placeholder="0" style="flex: 1;">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.parentElement.remove()">-</button>
            </div>
        </div>
    `;
    container.appendChild(div);
}

// PATCH 8: Updated handleFileUpload to process Excel with new field structure
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
            const workbook = XLSX.read(data, {
                type: 'array'
            });
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
                    // Look for various possible column headers (case insensitive)
                    const payPerAnnual = parseFloat(
                        row['Pay per Annual'] ||
                        row['pay per annual'] ||
                        row['PayPerAnnual'] ||
                        row['PA'] ||
                        0
                    );

                    const gross = parseFloat(
                        row['Annual Gross'] ||
                        row['annual gross'] ||
                        row['AnnualGross'] ||
                        row['Gross'] ||
                        row['gross'] ||
                        0
                    );

                    const isDoctor = String(
                        row['Doctor'] ||
                        row['doctor'] ||
                        row['Is Doctor'] ||
                        row['is doctor'] ||
                        'no'
                    ).toLowerCase() === 'yes';

                    if (gross > 0 || payPerAnnual > 0) {
                        const finalGross = gross > 0 ? gross : payPerAnnual;
                        results += calculateTax(payPerAnnual, finalGross, isDoctor);
                    }
                } catch (error) {
                    console.error(`Error processing row ${index + 1}:`, error);
                }
            });

            if (results) {
                document.getElementById('results').innerHTML = results;
                document.getElementById('results').scrollIntoView({
                    behavior: 'smooth'
                });
            } else {
                alert('No valid data found. Please ensure your Excel file has columns for "Pay per Annual", "Annual Gross", and optionally "Doctor" (yes/no)');
            }

        } catch (error) {
            alert('Error reading Excel file: ' + error.message);
        } finally {
            hideLoading(button, 'Upload & Calculate');
        }
    };

    reader.readAsArrayBuffer(file);
}
