# WhatsApp Image Template Support

## Overview
Your WhatsApp system now supports sending templates with header images. This allows you to send rich, visually appealing messages to your customers.

## How It Works

### 1. Configure Header Image in Settings
When creating or updating WhatsApp settings, you can now specify a `headerImageUrl`:

```json
{
  "name": "Ecommerce Campaign",
  "templateName": "ecommerce_website_v1",
  "phoneNumberId": "YOUR_PHONE_NUMBER_ID",
  "accessToken": "YOUR_ACCESS_TOKEN",
  "verifyToken": "YOUR_VERIFY_TOKEN",
  "apiUrl": "https://graph.facebook.com/v18.0",
  "language": "en",
  "headerImageUrl": "https://yourdomain.com/images/template-header.jpg",
  "isDefault": true
}
```

### 2. Send Bulk Messages with Image Template
When sending bulk messages, the system will automatically use the `headerImageUrl` from your settings:

```json
POST /whatsapp/send-bulk
{
  "name": "Diwali Campaign",
  "contacts": [
    { "name": "John Doe", "phone": "919876543210" },
    { "name": "Jane Smith", "phone": "919876543211" }
  ],
  "templateName": "ecommerce_website_v1",
  "headerImageUrl": "https://yourdomain.com/images/diwali-offer.jpg"
}
```

### 3. Priority Order for Header Images
The system uses the following priority:
1. **Campaign-specific image**: If you provide `headerImageUrl` in the campaign/bulk request
2. **Settings default image**: If configured in WhatsApp settings
3. **No image**: If neither is provided, template sends without header image

## Image Requirements

### WhatsApp Image Specifications:
- **Format**: JPG, PNG
- **Size**: Maximum 5MB
- **Dimensions**: Recommended 800x418 pixels (aspect ratio 1.91:1)
- **URL**: Must be publicly accessible HTTPS URL
- **Response time**: Server must respond within 5 seconds

## API Endpoints

### Update Settings with Header Image
```
PUT /settings/:id
{
  "headerImageUrl": "https://yourdomain.com/images/new-header.jpg"
}
```

### Create Campaign with Custom Image
```
POST /whatsapp/campaigns
{
  "name": "Special Offer",
  "templateName": "ecommerce_website_v1",
  "contacts": [...],
  "headerImageUrl": "https://yourdomain.com/images/special-offer.jpg"
}
```

## Example Template Structure

Your WhatsApp template should have:
- **Header**: IMAGE type
- **Body**: Your message text
- **Footer**: Optional footer text
- **Buttons**: Call-to-action buttons (optional)

## Testing

1. Upload your image to a publicly accessible server
2. Configure the `headerImageUrl` in settings or campaign
3. Send a test message to verify the image displays correctly
4. Check WhatsApp Business Manager for template approval status

## Troubleshooting

### Image not displaying:
- Verify URL is publicly accessible
- Check image meets WhatsApp specifications
- Ensure HTTPS protocol is used
- Verify server responds quickly (< 5 seconds)

### Template rejected:
- Image must comply with WhatsApp policies
- No misleading or inappropriate content
- Image should match template description

## Notes
- Images are cached by WhatsApp for performance
- Template must be approved by WhatsApp before use
- Different templates can use different images
- You can change images per campaign while using the same template
