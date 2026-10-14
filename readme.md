# Webhooks vs. Polling: Live Comparison Demo

## Introduction

This repository contains a live, interactive split-screen demonstration comparing the two primary ways isolated systems communicate over the public internet: polling and webhooks.

* **Polling (The Zapier Model):** Polling involves a client repeatedly requesting data from a server at regular intervals to ask if anything is new. Automation platforms like Zapier rely heavily on this; for instance, Zapier enforces a 15-minute polling interval and a 100-task limit on its free tier. This allows them to strictly control their infrastructure load, batch database queries, and prevent free users from exhausting expensive server processing power with rapid requests.


* **Webhooks (The Stripe Model):** Webhooks invert this control. Instead of the client asking, the server pushes data to the client the exact moment an event occurs. Payment providers like Stripe rely almost exclusively on webhooks because real-time updates are essential for a frictionless e-commerce experience.



## Features

* **Split-Screen UI:** Visually compare the network traffic of a polling client and a webhook receiver reacting to the exact same event simultaneously.
* **Latency vs. Instant Push:** See firsthand how polling introduces artificial latency, while webhooks deliver data instantly.


* **Glitch Simulation (Idempotency):** Safely test what happens when a network glitch causes an event payload to be delivered twice.



## Prerequisites

* Node.js installed on your local machine.

## Quick Start Setup

1. Create a new directory and navigate into it using your terminal:
```bash
mkdir webhook-demo
cd webhook-demo

```


2. Initialize a new Node project and install the Express framework:
```bash
npm init -y
npm install express

```


3. Save the provided application code as `server.js` inside this folder.
4. Start the application:
```bash
node server.js

```


5. Open your web browser and navigate to `http://localhost:3000` to view the interactive presentation dashboard.

## Core Concepts Demonstrated

### 1. The Computational Waste of Polling

When you start the polling loop in the UI, you will see the client repeatedly asking the server for updates. If the answer is "0 new events," the system is wasting network bandwidth and API rate limits on empty checks. To illustrate this scale: 10,000 clients polling a server every 10 seconds generates 86.4 million requests a day, even on a day when absolutely nothing changed.

### 2. The Efficiency of Webhooks

When you trigger an event, the webhook receiver on the right panel gets the data instantly. During idle periods between events, webhooks consume absolutely zero bandwidth and zero server processing. They react to actionable facts rather than the absence of change.

### 3. Handling Duplicates (Idempotency)

Because the internet is unpredictable, webhook providers may accidentally send the exact same event multiple times. The demo includes a "Simulate Glitch" button to demonstrate how to defend against this. Your webhook receiver must track the unique identifier provided in the headers (such as `webhook-id` or Stripe's `event.id`) and check it against a database of previously processed events. If the server recognizes a duplicate, it safely skips the core business logic (to prevent double-charging a customer) but still returns an HTTP 2xx status to satisfy the provider's retry loop.

### 4. Handling Complete Downtime (Exponential Backoff)

If your server is completely offline when a webhook fires, enterprise providers do not immediately drop the data. Instead, they use a retry algorithm called exponential backoff. For example, Stripe retries failed live-mode webhook deliveries for up to three days, gradually increasing the wait time between each attempt. (Note: In a sandbox testing environment, Stripe only retries three times over a few hours).

Because of these automated retry queues, your endpoint must acknowledge receipt fast. Stripe expects a successful 2xx response within 20 seconds, and GitHub requires it within 10 seconds. The best practice is to verify the webhook, save it to your database, instantly return a 200 OK, and process the heavy business logic asynchronously in the background.