# 📊 Meta Leads CSV Import Guide

## 🎯 Why Use CSV Import?

Meta's API has a **90-day retention policy** - leads older than 90 days are not accessible via API. However, the Meta Leads Center UI shows ALL historical leads. The CSV import feature allows you to:

✅ Import ALL historical leads (from 2021-2024)
✅ Bypass API limitations
✅ Get complete lead data instantly

---

## 📥 How to Import Leads from Meta

### Step 1: Export CSV from Meta Leads Center

1. Go to **Meta Business Suite** → **Leads Center**
2. Select your form
3. Click the **Download** button (top right)
4. Choose **Download as CSV**
5. Save the file to your computer

### Step 2: Import CSV to Your System

1. Go to your **Lead Center** page
2. Click the **"Import CSV"** button (top right)
3. Select the CSV file you downloaded
4. Wait for the import to complete
5. ✅ Done! All leads are now imported

---

## 📋 CSV Format Support

The import feature automatically detects and maps these columns:

| Meta CSV Column | Mapped To |
|----------------|-----------|
| `full_name` or `name` | Lead Name |
| `email` | Email Address |
| `phone_number` or `phone` | Phone Number |
| `company` | Company Name |
| `created_time` or `date` | Created Date |
| `id` | Lead ID |

**Note:** The import is flexible and will work with any CSV format that has these common column names.

---

## ✨ Features

### 1. **Duplicate Prevention**
- Uses `upsert` logic - won't create duplicates
- If a lead already exists (same ID), it updates the data
- Safe to import the same CSV multiple times

### 2. **Automatic Contact Sync**
- Leads with phone numbers are automatically synced to Contacts
- Ready for WhatsApp campaigns immediately

### 3. **Smart Field Mapping**
- Automatically detects column names (case-insensitive)
- Works with different CSV formats
- Skips empty or invalid rows

### 4. **Progress Feedback**
- Shows import count
- Reports skipped rows
- Clear success/error messages

---

## 🔄 Complete Workflow

### For First-Time Setup (Get ALL Historical Leads):

```
1. Export CSV from Meta Leads Center
   ↓
2. Import CSV to your system
   ↓
3. All historical leads are now in your database
   ↓
4. Set up webhook for real-time new leads (optional)
```

### For Regular Use:

```
Option A: Use "Sync Leads" button (gets recent leads via API)
Option B: Export & Import CSV (gets ALL leads including old ones)
Option C: Use webhook (automatic real-time sync)
```

---

## 📊 Example CSV Format

```csv
id,created_time,full_name,email,phone_number,company
123456,2023-05-21,John Doe,john@example.com,+1234567890,Acme Inc
789012,2023-06-15,Jane Smith,jane@example.com,+0987654321,Tech Corp
```

---

## 🎯 Expected Results

After importing a CSV with 13 leads:

```
✅ SUCCESS! 13 leads imported from CSV
```

Your Lead Center will show:
- All 13 leads with correct data
- Proper status (Intake by default)
- Contact information
- Created dates
- All leads synced to Contacts (if phone exists)

---

## 🐛 Troubleshooting

### Issue: "No file uploaded"
**Solution:** Make sure you selected a CSV file

### Issue: "Failed to parse CSV"
**Solution:** 
- Ensure the file is a valid CSV (not Excel .xlsx)
- Open in Excel/Google Sheets and "Save As CSV"

### Issue: "X rows skipped"
**Solution:** 
- Skipped rows are empty or missing all key fields (name, email, phone)
- This is normal - Meta sometimes includes header or empty rows

### Issue: Leads not showing up
**Solution:**
- Refresh the page
- Check the "All" tab
- Verify the CSV had valid data

---

## 💡 Pro Tips

1. **First Import:** Always use CSV import for historical data
2. **Regular Sync:** Use "Sync Leads" button for recent leads
3. **Real-time:** Set up webhooks for instant lead capture
4. **Backup:** Keep your CSV files as backups
5. **Re-import:** Safe to re-import - won't create duplicates

---

## 🚀 Quick Start

```bash
# 1. Download CSV from Meta Leads Center
# 2. Click "Import CSV" button
# 3. Select your CSV file
# 4. Wait for success message
# 5. Refresh page to see all leads
```

---

## 📞 Support

If you encounter issues:
1. Check backend logs for detailed error messages
2. Verify CSV format matches Meta's export format
3. Ensure file is UTF-8 encoded
4. Try with a smaller CSV first (test with 2-3 rows)

---

## ✅ Success Checklist

- [ ] Downloaded CSV from Meta Leads Center
- [ ] Clicked "Import CSV" button
- [ ] Selected the CSV file
- [ ] Saw success message with count
- [ ] Refreshed page
- [ ] All leads visible in Lead Center
- [ ] Leads synced to Contacts

**You're all set! 🎉**
