document.getElementById("calculateButton").addEventListener("click", () => {
    // Get input values
    const temp1 = parseFloat(document.getElementById("temp1").value);
    const temp2 = parseFloat(document.getElementById("temp2").value);
    const temp3 = parseFloat(document.getElementById("temp3").value);

    const na = parseFloat(document.getElementById("na").value);
    const nb = parseFloat(document.getElementById("nb").value);
    const nhcl = parseFloat(document.getElementById("nhcl").value);

    const vrmix = parseFloat(document.getElementById("vrmix").value) / 1000; // Convert to L
    const va = parseFloat(document.getElementById("va").value) / 1000; // Convert to L
    const vb = parseFloat(document.getElementById("vb").value) / 1000; // Convert to L

    const time = document.getElementById("timeValues").value.split(",").map(Number);

    const vnaoh1 = document.getElementById("vnaoh1").value.split(",").map(Number);
    const vnaoh2 = document.getElementById("vnaoh2").value.split(",").map(Number);
    const vnaoh3 = document.getElementById("vnaoh3").value.split(",").map(Number);

    const temperatures = [temp1, temp2, temp3];
    const vnaohData = [vnaoh1, vnaoh2, vnaoh3];
    const kValues = [];

    const resultsContainer = document.getElementById("reactionRateResults");
    resultsContainer.innerHTML = ""; // Clear previous results
    const plotsContainer = document.getElementById("plots");
    plotsContainer.innerHTML = ""; // Clear previous plots

    // Constants
    const ca0 = (na * va) / (va + vb);
    const cb0 = (nb * vb) / (va + vb);
    const vts = vrmix + vrmix;

    vnaohData.forEach((vnaohValues, index) => {
        const invCaValues = [];
        const regressorTime = [];
        const regressorInvCa = [];
        const temp = temperatures[index];

        // Calculate 1/CA
        vnaohValues.forEach((vnaoh, i) => {
            const nmhcl = (vrmix * nhcl) - (vnaoh / 1000 * nb); // Convert vnaoh to L
            const cb = nmhcl / vts;
            const ca = ca0 - (cb0 - cb);

            if (ca > 0) {
                invCaValues.push(1 / ca);
                regressorTime.push(time[i]);
                regressorInvCa.push(1 / ca);
            }
        });

        // Perform linear regression
        const n = regressorTime.length;
        const sumX = regressorTime.reduce((acc, val) => acc + val, 0);
        const sumY = regressorInvCa.reduce((acc, val) => acc + val, 0);
        const sumXY = regressorTime.reduce((acc, val, i) => acc + val * regressorInvCa[i], 0);
        const sumX2 = regressorTime.reduce((acc, val) => acc + val ** 2, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
        const intercept = (sumY - slope * sumX) / n;

        kValues.push(slope);

        // Display plot for 1/CA vs. Time
        const canvas = document.createElement("canvas");
        canvas.id = `plot${index}`;
        plotsContainer.appendChild(canvas);

        new Chart(canvas, {
            type: "scatter",
            data: {
                datasets: [
                    {
                        label: "1/CA Data Points",
                        data: regressorTime.map((x, i) => ({ x, y: regressorInvCa[i] })),
                        backgroundColor: "blue",
                    },
                    {
                        label: `Regression Line (k = ${slope.toFixed(4)})`,
                        data: regressorTime.map((x) => ({ x, y: slope * x + intercept })),
                        type: "line",
                        borderColor: "red",
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `1/CA vs. Time at ${temp} K`,
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Time (minutes)",
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "1/CA (L/mol)",
                        },
                    },
                },
            },
        });

        // Append slope to results
        const result = document.createElement("p");
        result.textContent = `Reaction rate constant (k) at ${temp} K: ${slope.toFixed(4)} L/(mol·min)`;
        resultsContainer.appendChild(result);
    });

    // Arrhenius plot
    const lnK = kValues.map((k) => Math.log(k));
    const reciprocalT = temperatures.map((t) => 1 / t);

    const n = reciprocalT.length;
    const sumX = reciprocalT.reduce((acc, val) => acc + val, 0);
    const sumY = lnK.reduce((acc, val) => acc + val, 0);
    const sumXY = reciprocalT.reduce((acc, val, i) => acc + val * lnK[i], 0);
    const sumX2 = reciprocalT.reduce((acc, val) => acc + val ** 2, 0);

    const arrheniusSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
    const arrheniusIntercept = (sumY - arrheniusSlope * sumX) / n;

    const activationEnergy = -arrheniusSlope * 8.314; // J/mol
    const frequencyFactor = Math.exp(arrheniusIntercept);

    const arrheniusCanvas = document.createElement("canvas");
    arrheniusCanvas.id = "arrheniusPlot";
    plotsContainer.appendChild(arrheniusCanvas);

    new Chart(arrheniusCanvas, {
        type: "scatter",
        data: {
            datasets: [
                {
                    label: "ln(k) Data Points",
                    data: reciprocalT.map((x, i) => ({ x, y: lnK[i] })),
                    backgroundColor: "blue",
                },
                {
                    label: `Regression Line`,
                    data: reciprocalT.map((x) => ({ x, y: arrheniusSlope * x + arrheniusIntercept })),
                    type: "line",
                    borderColor: "red",
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: "ln(k) vs. 1/T (Arrhenius Plot)",
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "1/T (1/K)",
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: "ln(k)",
                    },
                },
            },
        },
    });

    // Display Arrhenius results
    const arrheniusResults = document.getElementById("arrheniusResults");
    arrheniusResults.innerHTML = `
        <h2>Arrhenius Analysis Results</h2>
        <p>Activation Energy (E): ${activationEnergy.toFixed(2)} J/mol</p>
        <p>Frequency Factor (A): ${frequencyFactor.toExponential(2)}</p>
    `;
});
