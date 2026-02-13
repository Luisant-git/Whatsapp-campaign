# Database Architecture

## Central Database: `whatsapp_central`
**Purpose:** Stores tenant metadata and admin data

**Tables:**
- `Admin` - Admin users who manage the system
- `Tenant` - All registered users with their database connection info
- `SubscriptionPlan` - Available subscription plans
- `SubscriptionOrder` - User subscription orders

**Schema:** `prisma/schema-central.prisma`

**Example Data:**
```
Tenant Table:
id | email              | dbName        | dbHost    | dbPort | dbUser   | dbPassword
1  | user1@example.com  | tenant_1      | localhost | 5432   | postgres | root
2  | user2@example.com  | tenant_2      | localhost | 5432   | postgres | root
3  | user3@example.com  | tenant_3      | localhost | 5432   | postgres | root
```

---

## Tenant Databases: `tenant_1`, `tenant_2`, `tenant_3`, etc.
**Purpose:** Each user's isolated data (NO userId field)

**Tables:**
- `Contact` - User's contacts
- `Campaign` - User's campaigns
- `CampaignContact` - Campaign contacts
- `CampaignMessage` - Campaign messages
- `WhatsAppMessage` - WhatsApp messages
- `WhatsAppSettings` - WhatsApp configurations
- `MasterConfig` - Master configurations
- `AutoReply` - Auto-reply rules
- `QuickReply` - Quick-reply buttons
- `ChatSession` - Chat sessions
- `ChatMessage` - Chat messages
- `ChatLabel` - Chat labels
- `Document` - Uploaded documents
- `Group` - Contact groups
- `TenantConfig` - Tenant preferences

**Schema:** `prisma/schema-tenant.prisma`

---

## Database Flow

### User Registration:
1. User registers → Creates record in `whatsapp_central.Tenant`
2. System creates new database `tenant_<timestamp>`
3. System pushes schema to new tenant database
4. User data stored in their own database

### User Login:
1. User logs in → Query `whatsapp_central.Tenant` for credentials
2. Session stores `userId` (tenant ID)
3. Middleware resolves tenant database URL
4. All queries go to user's tenant database

### Data Access:
```
Request → TenantMiddleware → Central DB (get tenant info)
                           ↓
                    Attach tenant context to request
                           ↓
Controller → @TenantContext() → Get tenant DB URL
                           ↓
Service → TenantPrismaService → Connect to tenant DB
                           ↓
                    Query tenant's isolated database
```

---

## Database Comparison

### Central Database (`whatsapp_central`)
```sql
-- Stores WHO the users are
SELECT * FROM "Tenant";
id | email              | dbName
1  | user1@example.com  | tenant_1
2  | user2@example.com  | tenant_2
```

### Tenant Database (`tenant_1`)
```sql
-- Stores WHAT user1 has (no userId field)
SELECT * FROM "Contact";
id | name    | phone       | email
1  | John    | 919876543210| john@example.com
2  | Jane    | 919876543211| jane@example.com

SELECT * FROM "Campaign";
id | name           | status
1  | Summer Sale    | completed
2  | New Launch     | draft
```

### Tenant Database (`tenant_2`)
```sql
-- Stores WHAT user2 has (completely isolated)
SELECT * FROM "Contact";
id | name    | phone       | email
1  | Alice   | 919999999999| alice@example.com

SELECT * FROM "Campaign";
id | name           | status
1  | Black Friday   | running
```

---

## Key Points

✅ **Central DB** = User accounts + which database they use
✅ **Tenant DB** = User's actual data (contacts, campaigns, messages)
✅ **No userId** in tenant databases (complete isolation)
✅ **One tenant DB per user** (e.g., 100 users = 1 central + 100 tenant DBs)

---

## View Databases

```bash
# List all databases
psql -U postgres -l

# Expected output:
# whatsapp_central  - Main database
# tenant_1          - User 1's data
# tenant_2          - User 2's data
# tenant_3          - User 3's data

# View central database
psql -U postgres -d whatsapp_central -c "SELECT id, email, dbName FROM \"Tenant\";"

# View tenant database
psql -U postgres -d tenant_1 -c "\dt"
psql -U postgres -d tenant_1 -c "SELECT * FROM \"Contact\";"
```
