# Meta Razorpay Payment Integration - Setup Steps

## 1. Environment Variables (.env)
```
META_ACCESS_TOKEN=your_meta_access_token
META_CATALOG_ID=your_catalog_id
PHONE_NUMBER_ID=your_phone_number_id
```

## 2. Meta Manager Configuration (Already Done ✓)
- Payment Configuration Name: Payment_Razorpay
- WABA ID: 24366060823054981
- MID: acc_JBz4Xiep4JPFoH
- MCC: 5734
- Purpose Code: 02

## 3. Test Payment Flow

### Send Payment Request:
When customer selects "Pay Online", the system automatically sends UPI payment request via WhatsApp.

### Customer Flow:
1. Customer browses catalog → Selects product
2. Provides delivery details
3. Chooses "Pay Online"
4. Receives WhatsApp payment message with "Pay Now" button
5. Taps button → Selects UPI app (WhatsApp/GPay/PhonePe/etc)
6. Completes payment
7. Receives order confirmation

## 4. Webhook Setup (For Production)

Configure Razorpay webhook URL:
```
https://yourdomain.com/webhooks/razorpay
```

Events to subscribe:
- payment.captured
- order.paid

## 5. Testing

Test with your WhatsApp number:
1. Send "SHOP" to your WhatsApp Business number
2. Select a product from catalog
3. Complete order flow
4. Choose "Pay Online"
5. You'll receive payment request in WhatsApp
