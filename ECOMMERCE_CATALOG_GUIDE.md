# WhatsApp Ecommerce Catalog Guide

## Overview
Customers can now browse and purchase products directly through WhatsApp by sending simple messages.

## How It Works

### 1. Customer Triggers Catalog
Customer sends any of these keywords:
- `shop`
- `catalog`
- `products`

### 2. Browse Categories
- System sends interactive buttons with top 3 categories
- Customer clicks a category button (format: `cat:1`)

### 3. View Subcategories
- System shows list of subcategories for selected category
- Customer selects subcategory (format: `sub:2`)

### 4. Browse Products
- System displays products with prices
- Customer selects a product (format: `prod:5`)

### 5. Product Details
- System shows product image, description, and price
- Customer replies `BUY` to purchase

### 6. Place Order
- System asks for customer details
- Customer provides:
  ```
  NAME: John Doe
  ADDRESS: 123 Main St, City, State
  ```

### 7. Order Confirmation
- Order is created in the system
- Customer receives confirmation

## Message Flow Example

```
Customer: shop
Bot: 🛍️ Select a Category:
     [Electronics] [Clothing] [Food]

Customer: [Clicks Electronics]
Bot: Choose a subcategory:
     - Smartphones
     - Laptops
     - Accessories

Customer: [Selects Smartphones]
Bot: Select a product:
     - iPhone 15 Pro - ₹99,999
     - Samsung S24 - ₹79,999

Customer: [Selects iPhone 15 Pro]
Bot: *iPhone 15 Pro*
     
     Latest iPhone with A17 Pro chip
     
     💰 Price: ₹99,999
     
     Reply "BUY" to purchase this product

Customer: BUY
Bot: 📦 *iPhone 15 Pro* - ₹99,999
     
     Please provide your details:
     
     NAME: Your Full Name
     ADDRESS: Your Complete Address

Customer: NAME: John Doe
         ADDRESS: 123 Main St, Mumbai

Bot: ✅ Order placed successfully! Order ID: #123
```

## Setup Instructions

### 1. Database Setup
Run the ecommerce tables migration:
```bash
psql -U postgres -d tenent_db -f "d:\Whatsapp\backend\add-ecommerce-tables.sql"
```

### 2. Add Products
1. Login to admin panel
2. Go to Categories section
3. Add categories and subcategories
4. Go to Products section
5. Add products with images, prices, and descriptions

### 3. Test
Send "shop" to your WhatsApp Business number

## Features

✅ Interactive buttons for easy navigation
✅ Product images and descriptions
✅ Real-time inventory
✅ Order tracking
✅ Customer details collection
✅ Automatic order creation

## Keywords Reference

| Keyword | Action |
|---------|--------|
| `shop`, `catalog`, `products` | Show categories |
| `cat:ID` | Show subcategories |
| `sub:ID` | Show products |
| `prod:ID` | Show product details |
| `BUY` | Initiate purchase |

## Notes

- Maximum 3 buttons can be shown at once (WhatsApp limitation)
- For more categories, use list messages
- Product images must be publicly accessible URLs
- Orders are stored in the Order table
- Session data is maintained per customer phone number
