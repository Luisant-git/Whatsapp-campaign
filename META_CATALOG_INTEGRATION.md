# Meta Commerce Catalog Integration Guide

## Overview
This integration allows you to sync your products to Meta (Facebook) Commerce Catalog and trigger the catalog when users send messages on WhatsApp.

## Features Implemented

### 1. **Sync Products to Meta Catalog**
- Added "Sync" button in the Products table
- Each product can be individually synced to Meta Commerce Manager
- Products are uploaded with all details (name, description, price, image)

### 2. **Trigger Catalog on WhatsApp**
- When users send "shop", "catalog", or "products" message
- WhatsApp automatically shows the Meta Commerce Catalog
- Users can browse and purchase directly from the catalog

## Configuration

### Backend (.env)
```env
META_CATALOG_ID=903615129317651
META_ACCESS_TOKEN=EAAcMSpblosgBQr1xYP0MIbeHJQ7lecNhchuHO1jZCet3B8shfGg9SHePqGNwNbx6m4bXYD0e3dhG8JHV7vkCFkughkdhWg1LarmxgKjf0ZAbk7b3sduKw9jtkRM3AnKCl9j2BBYWSJu54e1K3plhLjDTtmbIVPV9a98ePON8ELpkF6iiLY67NhKHxBIIcasAZDZD
```

## How to Use

### Step 1: Add/Edit Products
1. Go to Products page in your admin panel
2. Add or edit products with:
   - Product name
   - Description
   - Price
   - Image (JPEG/PNG)
   - Category

### Step 2: Sync to Meta Catalog
1. Click the green "Sync" button next to any product
2. Product will be uploaded to Meta Commerce Manager
3. Success/error message will appear

### Step 3: Test on WhatsApp
1. Send a message to your WhatsApp Business number
2. Type: "shop" or "catalog" or "products"
3. Meta Commerce Catalog will appear
4. Users can browse and select products

## API Endpoints

### Sync Product to Meta
```
POST /ecommerce/products/:id/sync-meta
```

## Files Modified/Created

### Backend
- ✅ `meta-catalog.service.ts` - New service for Meta Catalog integration
- ✅ `ecommerce.controller.ts` - Added sync endpoint
- ✅ `ecommerce.module.ts` - Added MetaCatalogService provider
- ✅ `whatsapp-ecommerce.service.ts` - Integrated catalog trigger
- ✅ `.env` - Added Meta credentials

### Frontend
- ✅ `Products.jsx` - Added Sync button
- ✅ `ecommerce.js` - Added sync API call

## Product Data Format for Meta

```json
{
  "retailer_id": "product_123",
  "name": "Product Name",
  "description": "Product description",
  "price": 99900,  // Price in paise (₹999.00)
  "currency": "INR",
  "availability": "in stock",
  "condition": "new",
  "url": "https://yoursite.com/product/123",
  "image_url": "https://yoursite.com/uploads/product.jpg"
}
```

## Important Notes

1. **Image Requirements**:
   - Format: JPEG or PNG
   - Size: Max 5MB
   - Must be publicly accessible URL

2. **Price Format**:
   - Stored in rupees in database
   - Converted to paise for Meta (multiply by 100)

3. **Product URL**:
   - Must be a valid HTTPS URL
   - Points to your frontend product page

4. **Access Token**:
   - Never expire token recommended for production
   - Current token is temporary, get permanent one from Meta Business

## Troubleshooting

### Sync Failed
- Check if image URL is publicly accessible
- Verify Meta access token is valid
- Ensure catalog ID is correct

### Catalog Not Showing
- Verify WhatsApp Business account is connected to catalog
- Check if products are approved in Meta Commerce Manager
- Ensure at least one product is synced

### Image Not Displaying
- Image must be HTTPS
- Image must be JPEG or PNG
- Check image URL is accessible from Meta servers

## Next Steps

1. **Get Permanent Access Token**:
   - Go to Meta Business Suite
   - Generate never-expire token
   - Update in .env file

2. **Connect Catalog to WhatsApp**:
   - Go to Meta Commerce Manager
   - Link catalog to WhatsApp Business Account
   - Verify connection

3. **Bulk Sync**:
   - Add "Sync All" button to sync all products at once
   - Implement batch upload for better performance

4. **Auto-Sync**:
   - Automatically sync when product is created/updated
   - Keep Meta catalog in sync with your database

## Support

For issues or questions:
- Check Meta Commerce Manager for product status
- Review Meta Graph API documentation
- Verify WhatsApp Business API setup
