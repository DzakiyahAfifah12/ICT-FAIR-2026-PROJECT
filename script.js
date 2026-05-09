document.addEventListener('DOMContentLoaded', () => {

    // ================= MQTT SETUP =================
    const clientId = "harumassa719_" + Math.random().toString(16).substr(2, 8);
    const host = "wss://harumassa719.cloud.shiftr.io:443";

    const options = {
        keepalive: 60,
        clientId: clientId,
        username: "harumassa719",
        password: "vxKfuiAoGUKRibKt",
        protocolId: 'MQTT',
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 3000,
    };

    const client = mqtt.connect(host, options);

    //data grafik
    let phData = [];
    let suhuData = [];

    let phLabels = [];
    let suhuLabels = [];
    
    const maxData = 50;

    function getTimeNow() {
    const now = new Date();

    return now.getHours().toString().padStart(2, '0') + ":" +
           now.getMinutes().toString().padStart(2, '0') + ":" +
           now.getSeconds().toString().padStart(2, '0');
    }

    // ================= STATUS CONNECT =================
    client.on('connect', () => {
        console.log("MQTT CONNECTED:", clientId);

        const indicator = document.querySelector('.status-indicator');
        const label = document.querySelector('.status-label');

        if (indicator && label) {
            indicator.style.backgroundColor = "#2ecc71";
            indicator.style.boxShadow = "0 0 8px #2ecc71";
            label.innerText = "Connected";
        }

        // SUBSCRIBE TOPIC
        client.subscribe('tim/#');
        client.subscribe('gas/data');
    });

    client.on('reconnect', () => {
        console.log("Reconnecting...");
    });

    client.on('error', (err) => {
        console.log("MQTT ERROR:", err);
    });

    // ================= TERIMA DATA SENSOR =================
    client.on('message', (topic, message) => {
        const data = message.toString();

        console.log("TOPIC:", topic);
        console.log("DATA:", data);

        // ===== pH =====
        if (topic === "tim/Phair") {
            const phEl = document.querySelector('.card:nth-child(1) h3');
            const phLabel = document.querySelector('.card:nth-child(1) span');

            phEl.innerText = data;

            if (data > 7.5) {
                phLabel.innerText = "pH Tinggi (Basa)";
                phLabel.style.color = "#e74c3c";
            } else if (data < 6.5) {
                phLabel.innerText = "pH Rendah (Asam)";
                phLabel.style.color = "#f39c12";
            } else {
                phLabel.innerText = "Normal";
                phLabel.style.color = "#2ecc71";
            }

            let phValue = parseFloat(data);
            if (!isNaN(phValue)) {

                let last = phData.length ? phData[phData.length - 1] : phValue;

                let smooth = (last * 0.8) + (phValue * 0.2);
                phData.push(smooth);

                phLabels.push(getTimeNow());

            if (phData.length > maxData) {
                phData.shift();
                phLabels.shift();
            }
            
            updateGraph();
            }

        }

        // ===== SUHU =====
        if (topic === "tim/Suhuair") {
            const suhuEl = document.querySelector('.card:nth-child(2) h3');
            const suhuLabel = document.querySelector('.card:nth-child(2) span');

            suhuEl.innerText = data + "°C";
            suhuLabel.innerText = data > 30 ? "Terlalu Panas" : "Optimal";

            let suhuValue = parseFloat(data);

        if (!isNaN(suhuValue)) {

            let last = suhuData.length
                ? suhuData[suhuData.length - 1]
                : suhuValue;

            let smooth = (last * 0.8) + (suhuValue * 0.2);

            suhuData.push(smooth);

            suhuLabels.push(getTimeNow());

            if (suhuData.length > maxData) {
                suhuData.shift();
                suhuLabels.shift();
            }

            updateSuhuGraph();
            }
        }

        // ===== GAS =====
        if (topic === "gas/data") {
            const gasEl = document.querySelector('.card:nth-child(3) h3');
            const gasLabel = document.querySelector('.status-gas');

            gasEl.innerText = data + " PPM";

            if (data > 1000) {
                gasLabel.innerText = "Bahaya: Gas Tinggi!";
                gasLabel.style.color = "#e74c3c";
            } else {
                gasLabel.innerText = "Udara Bersih";
                gasLabel.style.color = "#2ecc71";
            }
        }
    });

   // ================= SWITCH FAN =================
    const fanToggle = document.getElementById('fanToggle');

    if (fanToggle) {
        fanToggle.addEventListener('change', function () {
            const status = this.checked ? "ON" : "OFF";

            client.publish("fan/angin", status);
            console.log("FAN:", status);
        });
    }

    // ================= SWITCH LED =================
    const ledToggle = document.getElementById('ledToggle');

    if (ledToggle) {
        ledToggle.addEventListener('change', function () {
            const status = this.checked ? "ON" : "OFF";

            client.publish("lampu/terang", status);
            console.log("LED:", status);
        });
    }

    // ================= ANIMASI GRAFIK =================
    // UPDATE pH
    function updateGraph() {
    const path = document.getElementById('phPath');
    if (!path || phData.length < 2) return;

    let d = "";

    phData.forEach((val, i) => {

        let x = (i / (maxData - 1)) * 100;

        let safeVal = Math.max(0, Math.min(14, val));
        let y = 40 - (safeVal / 14 * 40);

        if (i === 0) {
            d += `M ${x},${y}`;
        } else {
            d += ` L ${x},${y}`;
        }
    });

    const svg = path.closest('svg');

    // hapus label lama
    const oldLabels = svg.querySelectorAll('.time-label');
    oldLabels.forEach(label => label.remove());

    phLabels.forEach((time, i) => {

        if (i % 8 === 0) {

            let x = (i / (maxData - 1)) * 100;

            let txt = document.createElementNS("http://www.w3.org/2000/svg", "text");

            txt.setAttribute("x", x);
            txt.setAttribute("y", "44");

            txt.setAttribute("fill", "#666");
            txt.setAttribute("font-size", "2.8");

            txt.setAttribute("text-anchor", "middle");

            txt.setAttribute("class", "time-label");

            txt.textContent = time;

            svg.appendChild(txt);
        }
    });

    path.setAttribute("d", d);

    path.style.transition = "all 0.5s ease";
    }

    // UPDATE SUHU
    function updateSuhuGraph() {
    const path = document.getElementById('suhuPath');

    if (!path || suhuData.length < 2) return;

    let d = "";

    suhuData.forEach((val, i) => {

        let x = (i / (maxData - 1)) * 100;

        let safeVal = Math.max(0, Math.min(40, val));

        let y = 40 - (safeVal / 40 * 40);

        if (i === 0) {
            d += `M ${x},${y}`;
        } else {
            d += ` L ${x},${y}`;
        }
    });

    const svg = path.closest('svg');

// hapus label lama
const oldLabels = svg.querySelectorAll('.time-label');
oldLabels.forEach(label => label.remove());

suhuLabels.forEach((time, i) => {

    if (i % 8 === 0) {

        let x = (i / (maxData - 1)) * 100;

        let txt = document.createElementNS("http://www.w3.org/2000/svg", "text");

        txt.setAttribute("x", x);
        txt.setAttribute("y", "44");

        txt.setAttribute("fill", "#666");
        txt.setAttribute("font-size", "2.8");

        txt.setAttribute("text-anchor", "middle");

        txt.setAttribute("class", "time-label");

        txt.textContent = time;

        svg.appendChild(txt);
    }
});

    path.setAttribute("d", d);

    path.style.transition = "all 0.5s ease";
}

});
