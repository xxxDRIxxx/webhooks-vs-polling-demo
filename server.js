const express = require('express');
const app = express();

app.use(express.json());

// Server-side database
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
        <title>Live Demo | One event, two methods</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background-color: #0b1120; color: #ffffff; margin: 0; padding: 30px; display: flex; flex-direction: column; align-items: center; }
            .header { width: 100%; max-width: 1200px; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 15px; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 0.5px; }
            
            .controls { display: flex; gap: 15px; margin-bottom: 30px; }
            button { padding: 12px 24px; cursor: pointer; border: none; border-radius: 6px; font-size: 15px; font-weight: bold; transition: opacity 0.2s; }
            button:hover { opacity: 0.8; }
            button:active { transform: scale(0.98); }
            .btn-poll { background-color: #0284c7; color: white; }
            .btn-trigger { background-color: #d97706; color: white; }
            .btn-duplicate { background-color: #7c3aed; color: white; }
            
            .container { display: flex; width: 100%; max-width: 1200px; gap: 30px; }
            .panel { flex: 1; background: #1e293b; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); display: flex; flex-direction: column; }
            
            h2.left-title { color: #38bdf8; margin-top: 0; font-size: 20px; letter-spacing: 1px; }
            h2.right-title { color: #34d399; margin-top: 0; font-size: 20px; letter-spacing: 1px; }
            
            .specs { margin-bottom: 20px; color: #cbd5e1; font-size: 15px; }
            .specs p { margin: 5px 0; }
            .specs ul { padding-left: 20px; margin-top: 15px; color: #94a3b8; }
            .specs li { margin-bottom: 4px; }
            
            .log-window { flex-grow: 1; background: #0f172a; padding: 15px; height: 350px; overflow-y: auto; font-family: 'Courier New', monospace; border-radius: 8px; border: 1px solid #334155; font-size: 13px; }
            .log-line { margin: 0 0 6px 0; line-height: 1.4; border-bottom: 1px solid #1e293b; padding-bottom: 4px;}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>LIVE DEMO | One event, two methods</h1>
        </div>

        <div class="controls">
            <button class="btn-poll" id="togglePollBtn" onclick="togglePolling()">Start Polling Loop</button>
            <button class="btn-trigger" onclick="triggerSingleEvent()">Trigger One Event</button>
            <button class="btn-duplicate" onclick="sendDuplicate()">Simulate Glitch (Send Duplicate ID)</button>
        </div>

        <div class="container">
            <!-- LEFT PANEL: POLLING -->
            <div class="panel">
                <h2 class="left-title">LEFT / POLLING</h2>
                <div class="specs">
                    <p>GET /events every 3 seconds</p>
                    <ul>
                        <li>Blindly processes received data</li>
                        <li>waits for next cycle</li>
                        <li>logs request count</li>
                    </ul>
                </div>
                <div id="pollLogs" class="log-window"></div>
            </div>
            
            <!-- RIGHT PANEL: WEBHOOK -->
            <div class="panel">
                <h2 class="right-title">RIGHT / WEBHOOK</h2>
                <div class="specs">
                    <p>POST /webhook on event</p>
                    <ul>
                        <li>Server checks for duplicates</li>
                        <li>notification on event</li>
                        <li>log arrival time</li>
                    </ul>
                </div>
                <div id="webhookLogs" class="log-window"></div>
            </div>
        </div>

        <script>
            let pollInterval = null;
            let requestCount = 0;
            let lastEventId = null;

            function logPoll(message, color = '#94a3b8') {
                const time = new Date().toLocaleTimeString();
                const div = document.getElementById('pollLogs');
                div.innerHTML += \`<div class="log-line" style="color: \${color}">[\${time}] \${message}</div>\`;
                div.scrollTop = div.scrollHeight;
            }

            function logWebhook(message, color = '#34d399') {
                const time = new Date().toLocaleTimeString();
                const div = document.getElementById('webhookLogs');
                div.innerHTML += \`<div class="log-line" style="color: \${color}">[\${time}] \${message}</div>\`;
                div.scrollTop = div.scrollHeight;
            }

            // --- POLLING LOGIC ---
            function togglePolling() {
                const btn = document.getElementById('togglePollBtn');
                if (pollInterval) {
                    clearInterval(pollInterval);
                    pollInterval = null;
                    btn.innerText = "Start Polling Loop";
                    btn.style.backgroundColor = "#0284c7";
                    logPoll('=== Polling Stopped ===', '#ef4444');
                } else {
                    btn.innerText = "Stop Polling Loop";
                    btn.style.backgroundColor = "#ef4444";
                    logPoll('=== Polling Started ===', '#38bdf8');
                    
                    pollInterval = setInterval(async () => {
                        requestCount++;
                        try {
                            const res = await fetch('/api/poll');
                            const json = await res.json();
                            if (json.data.length === 0) {
                                logPoll(\`[Req #\${requestCount}] 0 new events. (Waste)\`);
                            } else {
                                json.data.forEach(evt => {
                                    // Default polling behavior: blindly process whatever the server returns
                                    logPoll(\`[Req #\${requestCount}] Processed Event: \${evt.id}!\`, '#fbbf24');
                                });
                            }
                        } catch (e) {
                            logPoll('Error connecting to API', '#ef4444');
                        }
                    }, 3000);
                }
            }

            // --- TRIGGER EVENT (Shows both simultaneously) ---
            async function triggerSingleEvent() {
                lastEventId = 'evt_' + Date.now();
                
                // 1. Add event to the database (Left panel)
                await fetch('/api/database/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: lastEventId })
                });

                // 2. Instantly push to the webhook receiver (Right panel)
                logWebhook(\`Incoming push detected... ID: \${lastEventId}\`, '#cbd5e1');
                const res = await fetch('/api/webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'webhook-id': lastEventId },
                    body: JSON.stringify({ action: 'data_updated' })
                });
                const text = await res.text();
                logWebhook(\`Processed: \${text}\`, '#34d399');
            }

            // --- DUPLICATE SIMULATION (Glitch on both sides) ---
            async function sendDuplicate() {
                if (!lastEventId) return alert('Please trigger an event first!');
                
                logWebhook(\`[GLITCH] Resending exact same payload... ID: \${lastEventId}\`, '#a78bfa');
                logPoll(\`[GLITCH] Cursor reset! Server will hand us old data... ID: \${lastEventId}\`, '#a78bfa');
                
                // 1. Glitch the polling side (re-inject the same ID as "unread" data)
                await fetch('/api/database/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: lastEventId })
                });

                // 2. Glitch the webhook side (push the same ID again immediately)
                const res = await fetch('/api/webhook', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'webhook-id': lastEventId },
                    body: JSON.stringify({ action: 'data_updated' })
                });
                const text = await res.text();
                logWebhook(\`API Response: \${text}\`, '#c084fc');
            }
        </script>
    </body>
    </html>
    `);
});

// =========================================================
// API ENDPOINTS
// =========================================================

// Left Side: Polling Endpoint
app.get('/api/poll', (req, res) => {
    // Only return events that haven't been polled yet
    const newEvents = database.events.filter(event => !event.polled);
    // Mark them as polled so they aren't returned again (unless manually re-injected)
    newEvents.forEach(event => event.polled = true);
    res.status(200).json({ data: newEvents });
});

// Right Side: Webhook Receiver Endpoint
app.post('/api/webhook', (req, res) => {
    const webhookId = req.headers['webhook-id'];

    // Server-Side Idempotency Check
    if (database.processedWebhookIds.has(webhookId)) {
        return res.status(200).send(`200 OK (Duplicate Ignored)`);
    }

    // Process normal event
    database.processedWebhookIds.add(webhookId);
    res.status(200).send('200 OK (Success)');
});

// Background Simulator: Adds event to DB so polling can find it
app.post('/api/database/add', (req, res) => {
    database.events.push({ id: req.body.id, polled: false });
    res.sendStatus(201);
});

app.listen(3000, () => {
    console.log(`Open browser to: http://localhost:3000`);
});