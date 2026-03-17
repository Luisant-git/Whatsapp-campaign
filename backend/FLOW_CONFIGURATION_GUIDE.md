# WhatsApp Flow Configuration Guide

## ✅ CORRECT WAY TO SEND FLOWS

### 1. In Flow Builder Preview (Meta Dashboard)

**Select: "Request data on first screen"**

This is correct because:
- Your endpoint provides dynamic data (departments, locations, dates, times)
- Flow will call your endpoint with `action: "INIT"` 
- Your flow handlers will return the initial dropdown data

**DON'T select: "No data"** - This skips the endpoint call and dropdowns will be empty

---

### 2. Programmatically Sending Flows

#### Option A: Using `flow_action: "data_exchange"` (RECOMMENDED)

```javascript
{
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: '919994683263',
  type: 'interactive',
  interactive: {
    type: 'flow',
    header: {
      type: 'text',
      text: 'Book an Appointment'
    },
    body: {
      text: 'Please fill out the form to book your appointment.'
    },
    footer: {
      text: 'Powered by Luisant'
    },
    action: {
      name: 'flow',
      parameters: {
        flow_message_version: '3',
        flow_token: 'appointment_1234567890_1_abc123',
        flow_id: 'YOUR_FLOW_ID',
        flow_cta: 'Book Now',
        flow_action: 'data_exchange' // ✅ Calls endpoint on first screen
      }
    }
  }
}
```

**When to use:**
- ✅ When first screen needs dynamic data from endpoint
- ✅ For appointment booking (departments, locations, dates, times)
- ✅ For forms with dropdown options from database
- ✅ When you need to track sessions with flow_token

#### Option B: Using `flow_action: "navigate"` (Static Data)

```javascript
{
  action: {
    name: 'flow',
    parameters: {
      flow_message_version: '3',
      flow_token: 'flow_1234567890_abc123',
      flow_id: 'YOUR_FLOW_ID',
      flow_cta: 'Start',
      flow_action: 'navigate', // ❌ Skips endpoint call
      flow_action_payload: {
        screen: 'APPOINTMENT',
        data: {
          // You must provide all data here
          department: [
            { id: 'sales', title: 'Sales' },
            { id: 'support', title: 'Support' }
          ],
          location: [
            { id: '1', title: 'New York' }
          ]
        }
      }
    }
  }
}
```

**When to use:**
- ✅ When all data is static and known at send time
- ✅ For simple forms without dynamic dropdowns
- ❌ NOT for appointment booking with dynamic data

---

## 📋 Flow Token Format

Your flow token should follow this pattern for proper tenant resolution:

```
{purpose}_{timestamp}_{tenantId}_{random}
```

Example:
```
appointment_1737123456789_1_abc123xyz
```

This allows your endpoint to extract the tenant ID from the token.

---

## 🔧 Endpoint Response Format

### ✅ CORRECT Response Format

```json
{
  "screen": "APPOINTMENT",
  "data": {
    "department": [
      { "id": "sales", "title": "Sales" },
      { "id": "support", "title": "Support" }
    ],
    "location": [
      { "id": "1", "title": "New York" },
      { "id": "2", "title": "London" }
    ]
  }
}
```

### ❌ WRONG Response Format

```json
{
  "version": "3.0",  // ❌ Don't include version in data exchange
  "data": {
    "error": "Failed"  // ❌ Missing required 'screen' property
  }
}
```

### Error Response Format

```json
{
  "screen": "APPOINTMENT",
  "data": {
    "error_message": "Failed to load data"  // ✅ Use error_message, not error
  }
}
```

### Success/Completion Response

```json
{
  "screen": "SUCCESS",
  "data": {
    "extension_message_response": {
      "params": {
        "flow_token": "appointment_1234567890_1_abc123"
      }
    }
  }
}
```

---

## 🎯 Flow Action Types

| Action | When Endpoint is Called | Use Case |
|--------|------------------------|----------|
| `data_exchange` | ✅ On first screen open | Dynamic data needed |
| `navigate` | ❌ Never | Static data provided in payload |

---

## 🔍 Request Types Your Endpoint Receives

### 1. Health Check (Ping)
```json
{
  "version": "3.0",
  "action": "ping"
}
```

**Response:**
```json
{
  "data": {
    "status": "active"
  }
}
```

### 2. INIT (First Screen)
```json
{
  "version": "3.0",
  "action": "INIT",
  "flow_token": "appointment_1234567890_1_abc123"
}
```

**Response:**
```json
{
  "screen": "APPOINTMENT",
  "data": {
    "department": [...],
    "location": [...]
  }
}
```

### 3. Data Exchange (Screen Submission)
```json
{
  "version": "3.0",
  "action": "data_exchange",
  "screen": "DETAILS",
  "data": {
    "department": "sales",
    "location": "1",
    "date": "2026-03-17",
    "time": "10:30",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+919994683263"
  },
  "flow_token": "appointment_1234567890_1_abc123"
}
```

**Response:**
```json
{
  "screen": "SUMMARY",
  "data": {
    "summary": "Sales appointment at New York on 2026-03-17 at 10:30\n\nName: John Doe\nEmail: john@example.com\nPhone: +919994683263"
  }
}
```

---

## 🚀 Quick Start Commands

### Send Flow via API (Node.js)

```bash
node send-flow-example.js
```

### Test Endpoint Locally

```bash
# Start your backend
npm run start:dev

# Test endpoint
curl -X POST https://whatsapp.luisant.cloud/meta/flows \
  -H "Content-Type: application/json" \
  -d '{"action":"ping","version":"3.0"}'
```

---

## 📝 Summary

### For Flow Builder Preview:
✅ **Select:** "Request data on first screen"

### For Sending Flows Programmatically:
✅ **Use:** `flow_action: "data_exchange"`

### For Endpoint Responses:
✅ **Always include:** `screen` property
✅ **Use:** `error_message` for errors (not `error`)
✅ **Don't include:** `version` in data exchange responses

---

## 🐛 Common Issues Fixed

1. ❌ **Error:** "response should have required property 'screen'"
   - ✅ **Fix:** Always return `{ screen: "...", data: {...} }`

2. ❌ **Error:** Empty dropdowns in flow
   - ✅ **Fix:** Use `flow_action: "data_exchange"` instead of `"navigate"`

3. ❌ **Error:** "Failed to process request"
   - ✅ **Fix:** Return proper error format with `screen` and `error_message`

4. ❌ **Error:** Flow doesn't call endpoint
   - ✅ **Fix:** Select "Request data on first screen" in Flow Builder
