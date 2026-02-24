# How to Enable GPS/Location Access

The AIQ HRMS attendance system requires GPS location access to validate that you are checking in/out from the correct office location (geofencing).

## Why is GPS Required?

- Verify you're at the office location when checking in/out
- Track geofence compliance (inside/outside office zone)
- Prevent fraudulent attendance from remote locations

---

## Enable Location Access in Chrome

### macOS:
1. Click the **lock icon** (🔒) or **location icon** (📍) in the address bar
2. Find **Location** in the dropdown menu
3. Select **Allow**
4. Refresh the page

### Alternative Method:
1. Go to Chrome Settings: `chrome://settings/content/location`
2. Find `http://localhost:5173` or your dashboard URL
3. Change to **Allow**
4. Refresh the page

---

## Enable Location Access in Safari

### macOS:
1. Safari Menu → **Settings** (⌘,)
2. Click **Websites** tab
3. Select **Location** from left sidebar
4. Find `localhost` in the list
5. Change to **Allow**
6. Refresh the page

### Alternative:
1. When the permission popup appears, click **Allow**
2. If you previously blocked it, you'll need to use Settings method above

---

## Enable Location Access in Firefox

### macOS:
1. Click the **lock icon** (🔒) in the address bar
2. Find **Location** in the dropdown
3. Click the **X** to clear blocked permission
4. Refresh the page - you'll get a new permission prompt
5. Click **Allow**

### Alternative Method:
1. Go to Firefox Settings/Preferences
2. Search for "permissions"
3. Click **Settings** next to Location
4. Find `http://localhost:5173`
5. Remove it or change status to Allow
6. Refresh the page

---

## Enable Location Access in Edge

### Windows/macOS:
1. Click the **lock icon** (🔒) in the address bar
2. Click **Permissions for this site**
3. Find **Location**
4. Change to **Allow**
5. Refresh the page

---

## Mobile (iOS Safari)

### iPhone/iPad:
1. Open **Settings** app
2. Scroll down to **Safari**
3. Tap **Location**
4. Select **Ask** or **Allow**
5. Go back to Safari and refresh the page

---

## Mobile (Chrome on Android)

### Android:
1. Tap the **three dots** (⋮) in Chrome
2. Tap **Settings**
3. Tap **Site settings**
4. Tap **Location**
5. Find your site and change to **Allow**
6. Refresh the page

---

## Troubleshooting

### "Location Not Available" Error
- Make sure your device has GPS/Location Services enabled
- On Mac: System Preferences → Security & Privacy → Privacy → Location Services
- On Windows: Settings → Privacy → Location
- Make sure your browser is allowed to access location

### "GPS Timeout" Error
- This usually means your device is having trouble getting a GPS signal
- Try moving near a window if you're indoors
- Make sure you're not in airplane mode
- Restart your browser and try again

### Still Not Working?
1. Try a different browser (Chrome recommended for best GPS support)
2. Clear your browser cache and cookies
3. Restart your computer
4. Check if your company firewall is blocking location services

---

## Using HRMS Without GPS (Fallback)

If you absolutely cannot enable GPS:

1. **Contact Your Admin** - They may be able to manually record your attendance
2. **Use Attendance Corrections** - Submit a correction request explaining the issue
3. **Alternative Check-in** - Some organizations allow desk phone or biometric alternatives

**Note:** Without GPS, you'll see a warning banner on the dashboard, but you can still access other features like Leave Requests, Payroll, and Profile.

---

## Privacy & Security

### What Location Data is Collected?
- Your GPS coordinates (latitude/longitude) at check-in and check-out times only
- Data is only captured when you press "Check In" or "Check Out" buttons
- We do NOT track your location continuously throughout the day

### How is Location Data Used?
- Validates you're at an authorized office location
- Records geofence compliance status
- Stored securely in the company database
- Visible only to HR administrators

### Can I Check In Without Location?
- No - location is required for attendance verification
- This prevents attendance fraud and ensures accurate records
- If you have privacy concerns, discuss alternative check-in methods with HR

---

## Testing Your GPS

To verify GPS is working:

1. Open Developer Console (F12 or Cmd+Option+I)
2. Go to Console tab
3. Type: `navigator.geolocation.getCurrentPosition(pos => console.log(pos.coords))`
4. Press Enter
5. If working, you'll see latitude and longitude values

Expected output:
```
{
  latitude: 13.067439,
  longitude: 80.237617,
  accuracy: 20,
  ...
}
```

---

**Last Updated:** February 24, 2026  
**For Support:** Contact your HR department or IT helpdesk
