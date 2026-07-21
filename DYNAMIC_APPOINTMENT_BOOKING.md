# Dynamic Appointment Booking System - System Design Specification

This document details the system design, database schemas, API architecture, implementation logic, and advanced optimization suggestions for the **Dynamic Appointment Booking System**.

---

## 1. System Architecture & Role-Based Access Control (RBAC)

The system supports two core roles:
1. **SuperAdmin**: Has global administrative access.
   - Can create, read, update, and toggle active status of Admin profiles.
   - Oversees system metrics, global audits, and platform configuration.
2. **Admin**: Profile is created by the SuperAdmin.
   - Configures a custom booking page.
   - Builds dynamic appointment forms using a Drag-and-Drop (DND) field builder.
   - Establishes custom booking slot durations (e.g., 5 min, 30 min, 45 min) and slot booking capacities.
   - Manages availability schedules, breaks, holidays, and custom/half-days off.
   - Reviews, edits, and deletes user appointment bookings.

---

## 2. Database Models (Mongoose Schemas)

The database design uses MongoDB with Mongoose. These schemas should be created inside your `src/Models/` directory.

### 2.1 Admin Model (`src/Models/Admin.js`)
Stores Admin credential and profile info.
```javascript
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  businessName: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  timezone: {
    type: String,
    default: "UTC" // e.g., "America/New_York", "Asia/Kolkata"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin'
  }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
```

### 2.2 Dynamic Form Configuration Model (`src/Models/FormConfig.js`)
Maintains the metadata of the custom dynamic fields designed by each Admin. The `order` field ensures Drag and Drop (DND) arrangements are saved accurately.
```javascript
const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  fieldKey: {
    type: String,
    required: true // e.g., "first_name", "phone_number"
  },
  label: {
    type: String,
    required: true // e.g., "First Name", "Phone Number"
  },
  type: {
    type: String,
    required: true,
    enum: ['text', 'number', 'email', 'tel', 'textarea', 'select', 'checkbox', 'radio']
  },
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    type: String // Only populated if field type is 'select', 'checkbox', or 'radio'
  }],
  order: {
    type: Number,
    required: true // Handles drag-and-drop visual hierarchy order
  }
});

const FormConfigSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    unique: true
  },
  fields: [FieldSchema]
}, { timestamps: true });

module.exports = mongoose.model('FormConfig', FormConfigSchema);
```

### 2.3 Slot Booking Settings Model (`src/Models/SlotSettings.js`)
Configures the default behavior of appointment slot intervals, max capacity per slot, working days, and default breaks.
```javascript
const mongoose = require('mongoose');

const WorkingDaySchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  startTime: {
    type: String, // format "HH:MM" e.g., "09:00"
    default: "09:00"
  },
  endTime: {
    type: String, // format "HH:MM" e.g., "17:00"
    default: "17:00"
  }
});

const BreakTimeSchema = new mongoose.Schema({
  name: { type: String, default: "Break" },
  startTime: { type: String, required: true }, // format "HH:MM"
  endTime: { type: String, required: true } // format "HH:MM"
});

const SlotSettingsSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    unique: true
  },
  slotDurationMinutes: {
    type: Number,
    required: true,
    default: 30 // Any custom value (5, 10, 15, 30, 45, 60, etc.)
  },
  capacityPerSlot: {
    type: Number,
    required: true,
    default: 1 // If set to 5, the slot remains "Available" until 5 users book it.
  },
  workingDays: [WorkingDaySchema],
  breakTimes: [BreakTimeSchema]
}, { timestamps: true });

module.exports = mongoose.model('SlotSettings', SlotSettingsSchema);
```

### 2.4 Holiday & Off-Days Model (`src/Models/Holiday.js`)
Stores custom holidays and day-off overrides (including full-days off and custom/half-days off).
```javascript
const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  date: {
    type: String, // Format: "YYYY-MM-DD"
    required: true
  },
  isFullDay: {
    type: Boolean,
    default: true
  },
  // If isFullDay is false, admin configures custom hours they are available/unavailable
  customStartTime: {
    type: String // Format: "HH:MM", e.g., "13:00" (available after 1 PM)
  },
  customEndTime: {
    type: String // Format: "HH:MM", e.g., "17:00"
  },
  reason: {
    type: String
  }
}, { timestamps: true });

// Ensure unique date per Admin
HolidaySchema.index({ adminId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Holiday', HolidaySchema);
```

### 2.5 Booking Model (`src/Models/Booking.js`)
Records final booked appointments. It dynamic-maps fields populated from the dynamic form config using a Mongoose Map.
```javascript
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  slotDate: {
    type: String, // Format: "YYYY-MM-DD"
    required: true
  },
  slotStartTime: {
    type: String, // Format: "HH:MM"
    required: true
  },
  slotEndTime: {
    type: String, // Format: "HH:MM"
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  // Key-value pair containing custom responses matching FormConfig schema fields
  dynamicResponses: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  }
}, { timestamps: true });

// Indexing for faster slot lookup & uniqueness check
BookingSchema.index({ adminId: 1, slotDate: 1, slotStartTime: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
```

---

## 3. Dynamic Form Logic & DND Integration

### How Drag-and-Drop (DND) Works
1. **Frontend Layer**:
   - The admin UI implements a Drag-and-Drop interface (using React components like `dnd-kit` or `react-beautiful-dnd`).
   - Every field block has a unique identifier and an integer `order` index.
   - When the user repositions a field, the list updates its indexes sequence-wise (`[ { order: 0 }, { order: 1 }, { order: 2 } ]`).
   - Saving sends the entire array of fields (with corrected `order` values) to the API.

2. **Backend Validation Layer**:
   - When a booking is submitted via `POST /api/bookings`, the server queries the admin's `FormConfig`.
   - The server dynamically verifies that the incoming payload (`dynamicResponses`) matches field requirements:
     - **Required Checks**: If field definition has `required: true`, the matching key must exist and not be empty.
     - **Type Checks**: Checks format validation (e.g., verifying pattern check for phone numbers/emails).
     - **Enum Option Validation**: Checks if field responses (for select/radio inputs) are within defined options arrays.

---

## 4. Availability & Slot Generation Algorithm

Here is the exact logical workflow used to determine available slots for a specific calendar date (`slotDate` e.g., `"2026-07-25"`):

```mermaid
graph TD
    A[Start: Request Date] --> B[Get Weekday]
    B --> C[Find Admin SlotSettings]
    C --> D{Is Weekday Open?}
    D -- No --> E[Return: Not Available]
    D -- Yes --> F[Fetch Holidays for slotDate]
    F --> G{Is Holiday?}
    G -- Full Day --> E
    G -- Custom/Half Day --> H[Adjust operational hours to Custom Window]
    G -- No Holiday --> I[Use Default Working Hours]
    H --> J[Generate Interval Slots based on Duration]
    I --> J
    J --> K[Subtract Lunch Breaks / Downtimes]
    K --> L[Fetch Existing Bookings for slotDate]
    L --> M[Group Bookings by Start/End Time]
    M --> N[For each slot: Compare Bookings Count with capacityPerSlot]
    N --> O{Count >= Capacity?}
    O -- Yes --> P[Mark Slot as "Booked"]
    O -- No --> Q[Mark Slot as "Available"]
    P --> R[Return Slots List]
    Q --> R
```

### Calculation Code Implementation
Example utility helper to place inside `src/Utils/slotGenerator.js`:
```javascript
const moment = require('moment'); // Optional helper library

function generateSlots(startTimeStr, endTimeStr, durationMinutes) {
  const slots = [];
  let current = moment(startTimeStr, "HH:mm");
  const end = moment(endTimeStr, "HH:mm");

  while (current.clone().add(durationMinutes, 'minutes').isSameOrBefore(end)) {
    const slotStart = current.format("HH:mm");
    const slotEnd = current.add(durationMinutes, 'minutes').format("HH:mm");
    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      status: "available",
      bookingsCount: 0
    });
  }
  return slots;
}

module.exports = { generateSlots };
```

---

## 5. API Routes & Controller Endpoints

Create standard express controllers in `src/Controllers/` to handle dynamic configurations.

### 5.1 SuperAdmin Endpoints
- `POST /api/superadmin/admins` - Create a new Admin account.
- `GET /api/superadmin/admins` - Fetch all Admins.
- `PUT /api/superadmin/admins/:id` - Edit Admin profile (basic information).
- `PUT /api/superadmin/admins/:id/toggle` - Activate/Deactivate Admin.

### 5.2 Admin Endpoints
- `POST /api/admin/auth/login` - Admin login.
- `GET /api/admin/profile` - Fetch Admin profile info.
- `PUT /api/admin/form-config` - Set, edit, and drag-order dynamic form configuration fields.
- `PUT /api/admin/slot-settings` - Configure slot intervals (e.g., 5 min vs. 30 min) and limit capacity.
- `GET /api/admin/bookings` - Fetch list of bookings with pagination.
- `PUT /api/admin/bookings/:id` - Update/Reschedule booking details.
- `DELETE /api/admin/bookings/:id` - Delete/Cancel booking.

### 5.3 Holiday/Day-Off Management Endpoints
- `POST /api/admin/holidays` - Register a full holiday or a half-day custom time slot.
- `GET /api/admin/holidays` - Fetch all registered holidays.
- `DELETE /api/admin/holidays/:id` - Remove a registered holiday/day-off.

### 5.4 Public Booking Endpoints (Customer Facing)
- `GET /api/public/form-config/:adminId` - Fetch the custom dynamic fields for UI rendering.
- `GET /api/public/available-slots/:adminId?date=YYYY-MM-DD` - Get live status of slots on a given date (showing "available", "booked", capacity).
- `POST /api/public/bookings/:adminId` - Submit a new appointment booking. Requires payload validation against dynamic fields metadata and checks for slot capacity.

---

## 6. Detailed Suggestions to Improve the Solution

To make this application enterprise-ready, robust, and highly scalable, implement these recommended enhancements:

### 6.1 Strict Concurrency Locking (Double-Booking Prevention)
**Problem**: If 2 users try to book the last slot at the same millisecond, standard database checks can lead to a double booking (race condition).
**Solutions**:
- **MongoDB Transactions (ACID)**: Wrap checking slot booking count + creating the booking document in a MongoDB Session Transaction.
- **Atomic Operations / Pre-booking Check**: Before inserting, run `findOneAndUpdate` with query filter checking that the bookings count is strictly less than the capacity limit.
- **Distributed Lock**: Use Redis (with a library like `Redlock`) to create a distributed lock key based on `${adminId}:${slotDate}:${slotStartTime}` for the duration of the writing operation.

### 6.2 UTC Normalization & Timezone Mapping
- **Problem**: Admin might be in `America/New_York` (EST) and a user in `Asia/Kolkata` (IST). Storing raw strings or local times causes offset mismatches.
- **Best Practice**:
  - Save all date-time calculations using UTC (ISO Strings or Unix timestamps).
  - Save the Admin's timezone preference (e.g., `America/New_York`) in `Admin` settings.
  - Convert slots dynamically relative to the target timezone on the frontend UI using `luxon` or `moment-timezone`.

### 6.3 Buffer Times Between Slots
- **Feature Suggestion**: Add a `bufferTimeMinutes` setting (e.g., 5-minute break between bookings).
- **Implementation**: During slot generation, calculate `totalInterval = slotDurationMinutes + bufferTimeMinutes` to space consecutive bookings.

### 6.4 Dynamic Form Validation via Joi/Zod
- **Enhancement**: Build validator middlewares that map the `FormConfig` field schema definition to a custom **Joi** or **Zod** validator object dynamically.
- **Benefit**: Ensures clean validation before hitting controllers, making payload parsing bulletproof.