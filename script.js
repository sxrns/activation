document.getElementById("calculateButton").addEventListener("click", function() {
    // Collect user inputs from the form
    const temperatures = [
        parseFloat(document.getElementById("temp1").value),
        parseFloat(document.getElementById("temp2").value),
        parseFloat(document.getElementById("temp3").value)
    ];

    const na = parseFloat(document.getElementById("na").value);
    const nb = parseFloat(document.getElementById("nb").value);
    const nhcl = parseFloat(document.getElementById("nhcl").value);
    const vrmix = parseFloat(document.getElementById("vrmix").value) / 1000;  // Convert to L
    const va = parseFloat(document.getElementById("va").value) / 1000;  // Convert to L
    const vb = parseFloat(document.getElementById("vb").value) / 1000;  // Convert to L
    const time = Array.from(document.getElementById("timeValues").value.split(',').map(x => parseFloat(x.trim())));

    // Extract titration volumes for each temperature (in mL, convert to L)
    const vnaohData = [
        document.getElementById("vnaoh1").value.split(',').map(x => parseFloat(x.trim()) / 1000), // Temp 1
        document.getElementById("vnaoh2").value.split(',').map(x => parseFloat(x.trim()) / 1000), // Temp 2
        document.getElementById("vnaoh3").value.split(',').map(x => parseFloat(x.trim()) / 1000)  // Temp 3
    ];

    // Initial concentrations
    const ca0 = (na * va) / (va + vb);
    const cb0 = (nb * vb) / (va + vb);
    const vts = vrmix + 10 / 1000; // Volume of HCl + volume of reaction mixture (L)

    // To store rate constants for each temperature
    const kValues = [];
    const plots = document.getElementById("plots");
    plots.innerHTML = '';  // Clear previous plots

    // Loop through each temperature
    for (let i = 0; i < temperatures.length; i++) {
        const temp = temperatures[i];
        const vnaohValues = vnaohData[i];
        const invCaValues = [];
        const timeValues = [];

        // Calculate 1/CA values
        for (let j = 0; j < time.length; j++) {
            const vnaoh = vnaohValues[j];
            // Calculate moles of HCl reacted with NaOH
            const nmhcl = (nhcl * vrmix) - (vnaoh * nb);
            const cb = nmhcl / vts;  // Concentration of unreacted NaOH
            const ca = ca0 - (cb0 - cb);  // Concentration of unreacted ethyl acetate
            const invCa = 1 / ca;  // Inverse of concentration
            invCaValues.push(invCa);
            timeValues.push(time[j]);
        }

        // Linear regression (slope = reaction rate constant k)
        const { slope } = linearRegression(timeValues, invCaValues);
        kValues.push(slope);

        // Plot 1/CA vs. time for each temperature
        const canvas = document.createElement("canvas");
        plots.appendChild(canvas);
        new Chart(canvas.getContext("2d"), {
            type: "line",
            data: {
                labels: timeValues,
                datasets: [{
                    label: `1/CA vs. Time at ${temp} K`,
                    data: invCaValues,
                    borderColor: "blue",
                    fill: false,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                title: {
                    display: true,
                    text: `1/CA vs. Time at ${temp} K`
                },
                scales: {
                    x: { title: { display: true, text: "Time (minutes)" } },
                    y: { title: { display: true, text: "1/CA (L/mol)" } }
                }
            }
        });

        // Display reaction rate constant (k) for this temperature
        const resultDiv = document.getElementById("reactionRateResults");
        const kText = `Reaction rate constant (k) at ${temp} K: ${slope.toFixed(4)} L/(mol·min)`;
        resultDiv.innerHTML += `<p>${kText}</p>`;
    }

    // Perform Arrhenius analysis (ln(k) vs 1/T)
    const lnK = kValues.map(k => Math.log(k));
    const reciprocalTemps = temperatures.map(temp => 1 / temp);

    // Linear regression for Arrhenius plot
    const { slope, intercept } = linearRegression(reciprocalTemps, lnK);

    // Calculate activation energy and frequency factor
    const R = 8.314;  // Gas constant in J/(mol·K)
    const activationEnergy = -slope * R;  // E = -slope * R
    const frequencyFactor = Math.exp(intercept);  // A = exp(intercept)

    // Plot the Arrhenius plot
    const arrheniusCanvas = document.createElement("canvas");
    plots.appendChild(arrheniusCanvas);
    new Chart(arrheniusCanvas.getContext("2d"), {
        type: "line",
        data: {
            labels: reciprocalTemps,
            datasets: [{
                label: 'Arrhenius Plot (ln(k) vs 1/T)',
                data: lnK,
                borderColor: "green",
                fill: false,
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: "Arrhenius Plot: ln(k) vs 1/T"
            },
            scales: {
                x: { title: { display: true, text: "1/T (1/K)" } },
                y: { title: { display: true, text: "ln(k)" } }
            }
        }
    });

    // Display Arrhenius results
    const arrheniusResults = `
        <h3>Arrhenius Analysis Results</h3>
        <p>Activation Energy (E): ${activationEnergy.toFixed(2)} J/mol</p>
        <p>Frequency Factor (A): ${frequencyFactor.toExponential(2)}</p>
    `;
    document.getElementById("arrheniusResults").innerHTML = arrheniusResults;
});

// Linear regression function (y = mx + b)
function linearRegression(xValues, yValues) {
    const n = xValues.length;
    const sumX = xValues.reduce((acc, x) => acc + x, 0);
    const sumY = yValues.reduce((acc, y) => acc + y, 0);
    const sumXY = xValues.reduce((acc, x, i) => acc + x * yValues[i], 0);
    const sumX2 = xValues.reduce((acc, x) => acc + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
}
