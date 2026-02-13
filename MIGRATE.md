# Migration Commands

```bash
# 1. Generate Prisma clients
cd backend
npx prisma generate --schema=./prisma/schema-central.prisma
npx prisma generate --schema=./prisma/schema-tenant.prisma

# 2. Create central database
npx prisma db push --schema=./prisma/schema-central.prisma

# 3. Run migration (creates tenant databases and migrates data)
npx ts-node scripts/migrate.ts

# 4. Verify migration
psql -U postgres -l
psql -U postgres -d whatsapp_central -c "SELECT id, email, dbName FROM \"Tenant\";"

# 5. Update user service
cd src\user
move user.service.ts user.service.old.ts
move user.service.new.ts user.service.ts

# 6. Update contact service (example)
cd ..\contact
move contact.service.ts contact.service.old.ts
move contact.service.new.ts contact.service.ts
move contact.controller.ts contact.controller.old.ts
move contact.controller.new.ts contact.controller.ts

# 7. Start application
cd ..\..
npm run start:dev

# Rollback (if needed)
psql -U postgres -c "DROP DATABASE whatsapp_central;"
psql -U postgres -c "DROP DATABASE tenant_1;"
cd src\user
move user.service.old.ts user.service.ts
```
