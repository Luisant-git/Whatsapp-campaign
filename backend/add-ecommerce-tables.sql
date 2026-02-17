-- E-commerce tables for WhatsApp (Tenant Schema)

-- Category table
CREATE TABLE "Category" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- SubCategory table
CREATE TABLE "SubCategory" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "categoryId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE,
  UNIQUE("name", "categoryId")
);

-- Product table
CREATE TABLE "Product" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "price" DECIMAL(10,2) NOT NULL,
  "imageUrl" VARCHAR(500),
  "subCategoryId" INTEGER NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE CASCADE
);

-- Order table
CREATE TABLE "Order" (
  "id" SERIAL PRIMARY KEY,
  "customerName" VARCHAR(255) NOT NULL,
  "customerPhone" VARCHAR(50) NOT NULL,
  "customerAddress" TEXT,
  "productId" INTEGER NOT NULL,
  "quantity" INTEGER DEFAULT 1,
  "totalAmount" DECIMAL(10,2) NOT NULL,
  "status" VARCHAR(50) DEFAULT 'pending',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);
