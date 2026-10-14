
# Webhooks vs. Polling Demo

## Introduction

This repository contains a live, interactive demonstration of the two primary ways isolated systems communicate over the public internet: polling and webhooks.

* **Polling (The Zapier Model):** Polling involves a client repeatedly asking a server if new data is available. For example, automation platforms like Zapier utilize a 15-minute polling interval on their free tiers. This allows them to strictly control their infrastructure load by batching database queries, preventing unpredictable user data from overwhelming their servers for zero revenue.


* **Webhooks (The Stripe Model):** Webhooks invert this control; the server pushes data to the client the exact moment an event occurs. Payment providers like Stripe rely almost exclusively on webhooks because real-time updates are essential for a frictionless e-commerce experience. Stripe gladly absorbs the massive infrastructure cost of pushing this data because instant checkouts directly maximize their transaction volume.



## Features

* **Interactive UI:** A built-in dashboard to visualize network requests in real-time.
* **Polling Simulation:** Watch how continuous empty checks waste computational resources.


* **Webhook Simulation:** See how data is pushed instantly with zero idle waste.
* **Idempotency Defense:** Test what happens when a provider sends the exact same webhook twice due to a network glitch.



## Prerequisites

* Node.js installed on your local machine.

## Quick Start Setup

1. Create a new directory and navigate into it using your terminal:
`mkdir webhook-demo`
`cd webhook-demo`
2. Initialize a new Node project and install the Express framework:
`npm init -y`
`npm install express`
3. Save the provided application code as `server.js` inside this folder.
4. Start the application:
`node server.js`
5. Open your web browser and navigate to `http://localhost:3000` to view the interactive presentation dashboard.

## Core Concepts Demonstrated

### 1. The Waste of Polling

When you start the polling client in the UI, you will see it repeatedly asking the server for updates. If the interval is short and nothing is happening, you generate massive computational waste. If 10,000 clients poll a server every 10 seconds, it generates over 86 million requests a day even if zero underlying data changes have occurred.

### 2. The Efficiency of Webhooks

When you use the webhook trigger, the data arrives instantly. During idle periods between events, webhooks consume absolutely zero bandwidth and zero server processing power.

### 3. Handling Duplicates (Idempotency)

The internet is unpredictable. Sometimes a provider like Stripe might experience a dropped connection and think a webhook failed to deliver, causing them to send the exact same event a second time. The demo includes an idempotency check: it extracts the unique `webhook-id` header and verifies it against a database of processed events. If it sees a duplicate, it safely skips the business logic to avoid double-processing (like charging a customer twice), but still returns an HTTP 200 OK status to satisfy the provider's retry loop.

### 4. Handling Downtime (Exponential Backoff)

If your server is completely offline when a webhook fires, enterprise providers will not immediately drop the data. Instead, they use an algorithm called exponential backoff to retry the delivery over an extended period. For example, Stripe retries failed live-mode webhooks for up to three days, gradually increasing the wait time between each attempt. Because of this strict timeout and retry schedule, your endpoint must always acknowledge receipt quickly and process complex, time-consuming logic in the background.
