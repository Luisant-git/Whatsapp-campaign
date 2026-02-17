# WhatsApp E-Commerce Setup

## Database Setup

1. Run the migration:
```bash
cd backend
psql -U your_user -d your_database -f add-ecommerce-tables.sql
```

2. Generate Prisma client:
```bash
npx prisma generate
```

## Backend Setup

The e-commerce module is already integrated. Just restart your backend:
```bash
npm run start:dev
```

## Frontend Routes

Add these routes to your frontend App.jsx:

```jsx
import Categories from './components/Categories';
import Products from './components/Products';
import Orders from './components/Orders';

// Add to your routes:
<Route path="/categories" element={<Categories />} />
<Route path="/products" element={<Products />} />
<Route path="/orders" element={<Orders />} />
```

## WhatsApp Customer Flow

Customers interact via WhatsApp messages:

1. **Start Shopping**: Customer sends "shop" or "catalog"
   - Bot shows category buttons

2. **Select Category**: Customer clicks category button
   - Bot shows subcategory list

3. **Select SubCategory**: Customer selects subcategory
   - Bot shows product list with prices

4. **View Product**: Customer selects product
   - Bot shows product image, description, price
   - Shows "Reply BUY:{productId} to purchase"

5. **Buy Product**: Customer replies "BUY:123"
   - Bot asks for customer details (Name, Address)

6. **Submit Details**: Customer replies:
   ```
   NAME: John Doe
   ADDRESS: 123 Main St, City
   ```
   - Order is created
   - Admin can see order in dashboard

## WhatsApp Integration

Add this to your WhatsApp webhook handler (whatsapp.service.ts):

```typescript
import { WhatsappEcommerceService } from '../ecommerce/whatsapp-ecommerce.service';

// In your webhook handler:
async handleIncomingMessage(message) {
  const text = message.text?.body;
  const phone = message.from;
  
  // Check if it's an e-commerce message
  const ecomResponse = await this.whatsappEcommerceService.handleIncomingMessage(
    phone, text, userId, accessToken, phoneNumberId
  );
  
  if (ecomResponse) return;
  
  // Handle BUY request
  if (text.startsWith('BUY:')) {
    const productId = parseInt(text.split(':')[1]);
    await this.whatsappEcommerceService.handleBuyRequest(
      phone, productId, userId, accessToken, phoneNumberId
    );
    return;
  }
  
  // Handle order submission
  if (text.includes('NAME:') && text.includes('ADDRESS:')) {
    // Get productId from session/context
    const created = await this.whatsappEcommerceService.createOrderFromMessage(
      phone, text, productId, userId
    );
    if (created) {
      // Send confirmation
    }
  }
  
  // ... rest of your handlers
}
```

## Admin Dashboard

1. **Categories**: `/categories` - Create categories and subcategories
2. **Products**: `/products` - Add products with images, prices
3. **Orders**: `/orders` - View and manage customer orders

## Environment Variables

Add to backend .env:
```
BASE_URL=http://localhost:3010
```

## Testing

1. Create categories and products via admin dashboard
2. Send "shop" to your WhatsApp number
3. Follow the interactive flow
4. Place an order
5. Check orders in admin dashboard
