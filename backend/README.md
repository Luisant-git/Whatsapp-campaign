1.Install dependencies:
npm install

2.Create .env file with below config:
PORT=your_port
CENTRAL_DATABASE_URL=your_central_database_url
TENANT_DATABASE_URL=your_tenant_database_url
JWT_SECRET=your_jwt_secret
UPLOAD_URL=your_upload_url
FRONTEND_URL=your_frontend_url
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
GROQ_API_KEY=your_groq_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key

3.For Central Database (stores tenant metadata):
npx prisma db push --schema=./prisma/schema-central.prisma
npx prisma generate --schema=./prisma/schema-central.prisma

4.For Tenant Database (each tenant's data):
npx prisma db push --schema=./prisma/schema-tenant.prisma
npx prisma generate --schema=./prisma/schema-tenant.prisma

5.Start the server:
npm run start:dev