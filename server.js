const express = require('express');
const app = express();

app.use(express.json());

// In-memory database
const database = {
    events: [],
    processedWebhookIds: new Set()
};

// =========================================================
// THE VISUAL UI (Frontend)
// =========================================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Webhooks vs Polling Demo</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #ffffff; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
            .container { display: flex; width: 100%; max-width: 1200px; gap: 30px; }
            .panel { flex: 1; background: #1e1e1e; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
            h1 { color: #4DA8DA; text-align: center; }
            h2 { color: #cccccc; border-bottom: 1px solid #333; padding-bottom: 10px; margin-top: 0; }
            h3 { color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin-top: 25px;}
            p.desc { font-size: 13px; color: #aaa; margin-top: -5px; margin-bottom: 15px;}
            button { width: 100%; padding: 12px; margin-bottom: 10px; cursor: pointer; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; transition: opacity 0.2s; }
            button:hover { opacity: 0.8; }
            button:active { transform: scale(0.98); }
            
            .btn-start { background-color: #007acc; color: white; }
            .btn-stop { background-color: #cc3300; color: white; }
            .btn-event { background-color: #d29034; color: white; }
            .btn-webhook { background-color: #2ea043; color: white; }
            .btn-duplicate { background-color: #8957e5; color: white; }
            
            .log-window { background: #000; padding: 15px; height: 500px; overflow-y: auto; font-family: 'Courier New', Courier, monospace; border-radius: 8px; border: 1px solid #333; font-size: 14px; }
            .log-line { margin: 0 0 5px 0; line-height: 1.4; }
        </style>
    </head>
    <body>
        <h1>Team 2: Webhooks vs. Polling</h1>
        <div class="container">
            <div class="panel">
                <h2>Presentation Controls</h2>
                
                <h3>1. Polling (The "Are We There Yet?" Method)</h3>
                <p class="desc">Client constantly asks the server for updates.</p>
                <button class="btn-start" id="startPollBtn" onclick="startPolling()">Start Polling (Every 2 seconds)</button>
                <button class="btn-stop" id="stopPollBtn" onclick="stopPolling()">Stop Polling</button>
                <button class="btn-event" onclick="triggerEvent()">Trigger Background Event</button>

                <h3>2. Webhooks (The "Push" Method)</h3>
                <p class="desc">Server pushes data instantly only when an event occurs.</p>
                <button class="btn-webhook" onclick="sendWebhook()">Simulate Incoming Webhook (Instant)</button>
                
                <h3>3. Failure Modes (Idempotency)</h3>
                <p class="desc">What happens if a network glitch sends the webhook twice?</p>
                <button class="btn-duplicate" onclick="sendDuplicateWebhook()">Send Exact Same Webhook Again</button>
            </div>
            
            <div class="panel">
                <h2>Live Network Logs</h2>
                <div id="logs" class="log-window"></div>
            </div>
        </div>

        <script>
            let pollInterval = null;
            const logsDiv = document.getElementById('logs');

            function log(message, color = '#0f0') {
                const time = new Date().toLocaleTimeString();
                logsDiv.innerHTML += \`<div class="log-line" style="color: \${color}">[\${time}] \${message}</div>\`;
                logsDiv.scrollTop = logsDiv.scrollHeight;
            }

            // --- POLLING LOGIC ---
            function startPolling() {
                if (pollInterval) return;
                log('=== Polling Client Started ===', '#007acc');
                pollInterval = setInterval(async () => {
                    log('Client: Asking API "Anything new?"...', '#888');
                    try {
                        const res = await fetch('/api/poll');
                        const json = await res.json();
                        if (json.data.length === 0) {
                            log('Server: 0 new events. (Resource Wasted)', '#cc3300');
                        } else {
                            log(\`Server: YES! Found \${json.data.length} new event(s)!\`, '#d29034');
                        }
                    } catch (e) {
                        log('Error connecting to server.', 'red');
                    }
                }, 2000);
            }

            function stopPolling() {
                clearInterval(pollInterval);
                pollInterval = null;
                log('=== Polling Client Stopped ===', '#007acc');
            }

            async function triggerEvent() {
                log('System: External event just happened! Waiting for polling to notice...', '#d29034');
                await fetch('/api/trigger', { method: 'POST' });
            }

            // --- WEBHOOK LOGIC ---
            async function sendWebhook() {
                log('=== Webhook Provider pushing data... ===', '#2ea043');
                const webhookId = 'evt_' + Date.now();
                window.lastWebhookId = webhookId; 
                
                const res = await fetch('/api/webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'webhook-id': webhookId },
                    body: JSON.stringify({ action: 'payment_succeeded' })
                });
                const text = await res.text();
                log(\`API Response: \${res.status} OK - \${text}\`, '#2ea043');
            }

            async function sendDuplicateWebhook() {
                if (!window.lastWebhookId) {
                    log('Error: Please send a normal webhook first.', '#cc3300');
                    return;
                }
                log(\`=== WARNING: Network glitch! Sending duplicate webhook (\${window.lastWebhookId}) ===\`, '#8957e5');
                
                const res = await fetch('/api/webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'webhook-id': window.lastWebhookId },
                    body: JSON.stringify({ action: 'payment_succeeded' })
                });
                const text = await res.text();
                log(\`API Response: \${res.status} OK - \${text}\`, '#8957e5');
            }
        </script>
    </body>
    </html>
    `);
});

// =========================================================
// ENDPOINT 1: Polling Receiver
// =========================================================
app.get('/api/poll', (req, res) => {
    const newEvents = database.events.filter(event => !event.polled);
    newEvents.forEach(event => event.polled = true);
    res.status(200).json({ data: newEvents });
});

// =========================================================
// ENDPOINT 2: Webhook Receiver 
// =========================================================
app.post('/api/webhook', (req, res) => {
    const webhookId = req.headers['webhook-id'];

    if (database.processedWebhookIds.has(webhookId)) {
        return res.status(200).send('Duplicate received: Skipped business logic, event already processed');
    }

    database.processedWebhookIds.add(webhookId);
    res.status(200).send('Webhook successfully received and processed instantly');
});

// =========================================================
// ENDPOINT 3: Event Trigger (Simulate the outside world)
// =========================================================
app.post('/api/trigger', (req, res) => {
    const event = { id: `evt_${Date.now()}`, action: 'user_registered', polled: false };
    database.events.push(event);
    res.status(201).json(event);
});

app.listen(3000, () => {
    console.log(`Open your browser and go to: http://localhost:3000`);
});