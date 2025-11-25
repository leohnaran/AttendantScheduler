# Secure Circuit Assembly Scheduler

A powerful, single-file browser application designed to streamline the scheduling of attendants for Jehovah's Witnesses Circuit Assemblies and Regional Conventions. This tool helps manage personnel, assign shifts efficiently, ensure a balanced workload, and generates print-ready schedules.

## 🚀 Quick Start

1.  **Download** the `schedule.html` file.
2.  **Open** the file in any modern web browser (Chrome, Firefox, Edge, Safari).
3.  **Start Scheduling!** No installation or server is required.

> **Note:** An active internet connection is required initially to load the necessary libraries (React, Tailwind CSS, etc.).

---

## ✨ Key Features

### 📋 Roster Management
*   **Easy Management:** Add, edit, or remove personnel.
*   **CSV Import:** Bulk import brothers using a simple CSV format.
*   **Key Man Teams:** Group attendants under "Key Men" for easier team management.
*   **Qualifications:** Track capabilities (e.g., Auditorium, Lobby, Key Man) to ensure the right person is assigned to the right task.

### ⚙️ Customizable Configuration
*   **Dynamic Layout:** Fully customize **Areas** (Departments), **Shifts** (Time Slots), and **Positions**.
*   **Rules Engine:** Configure assignment rules to fit your specific needs. Toggle constraints like "Avoid Consecutive Shifts" or "Anchor Limits".
*   **Severity Control:** Decide whether a rule violation (like double-booking) should be a hard **Block (Red)** or just a **Warning (Yellow)**.

### 📅 Intelligent Scheduling
*   **Magic Fill:** Automatically assign shifts based on fairness, qualifications, and availability constraints.
*   **Conflict Detection:** Real-time feedback prevents double-bookings and qualification mismatches.
*   **Find Replacement:** Quickly find a qualified, available substitute for any specific slot.
*   **Undo/Redo:** Experiment fearlessly with full history support.

### 📊 Views & Reports
*   **Schedule Grid:** The master view of all assignments.
*   **Department View:** A timeline view filtered by Area, optimized for printing department schedules.
*   **Assignment Slips:** Generate and print individual assignment slips for every brother.
*   **Time Stats:** Monitor "Minutes Away" from the program to ensure no one is overworked.

### 🔒 Security & Data
*   **Auto-Save:** Work is saved automatically to your browser's LocalStorage.
*   **Encrypted Export:** Save your schedule as a password-protected file to share securely with other overseers.

---

## 📖 How to Use

### 1. Initial Configuration
Before adding people, set up the structure of your assembly:
*   Go to the **Config** tab.
*   **Areas:** Define departments (e.g., Auditorium, Parking, Attendants).
*   **Shifts:** Define time slots (e.g., Morning Session, Lunch, Afternoon).
*   **Positions:** Create specific posts (e.g., "Door 1", "Roving"). Link them to Areas and define if they are "Rotational" (shift-based) or "Auditorium" (All Day/Anchor).
*   **Rules:** Adjust the logic. For example, set "Enforce Capabilities" to "Warn" if you want flexibility, or adjust the "Max Work Load" slider.

### 2. Building the Roster
*   Go to the **Roster** tab.
*   **Manual Entry:** Use the form at the top to add brothers one by one. Set their Role (Elder, MS) and Capabilities.
*   **CSV Import:** Click "Import CSV" to load a roster. *Format: First Name, Last Name, Gender, Full Name, Age, Appointment, Mobile, Key Man*.
*   **Grouping:** Drag and drop brothers onto a "Key Man" header to assign them to that team. This helps "Magic Fill" prioritize keeping teams together.

### 3. Creating the Schedule
*   Go to the **Schedule** tab.
*   **Auto-Fill:** Click **Magic Fill** to let the system attempt to fill empty slots. It respects your Rules (e.g., no consecutive shifts, max work %).
*   **Manual Assign:** Click any cell to pick a brother from the dropdown.
    *   **Green:** Recommended / Team Match.
    *   **Gray:** Not Qualified (but selectable if Rules allow).
    *   **⚠️ / ⛔:** Warning or Conflict based on your Rule settings.
*   **Find Replacement:** Click the search icon 🔍 next to a dropdown to find qualified brothers who are free during that specific time.

### 4. Review & Print
*   **Check Stats:** Go to **Time Stats** to ensure workload is balanced.
*   **Department Report:** Go to **Depts**, select an Area (e.g., "Lobby"), and print the timeline for that specific overseer.
*   **Individual Slips:** Go to **Slips** to generate cut-out slips for every brother.

### 5. Save & Share
*   Click **Save** in the top right.
*   Enter a password to encrypt the file.
*   Share the downloaded `.lock` file.
*   To open it on another device, click **Load**, upload the file, and enter the password.
