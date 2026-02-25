# Secure Circuit Assembly Scheduler

A powerful, single-file browser application designed to streamline the scheduling of attendants for Jehovah's Witnesses Circuit Assemblies and Regional Conventions. This tool helps manage personnel, assign shifts efficiently, ensure a balanced workload, and generates print-ready schedules.

## 🚀 Quick Start

1.  **Download** the `schedule.html` file.
2.  **Open** the file in any modern web browser (Chrome, Firefox, Edge, Safari).
3.  **Start Scheduling!** No installation or server is required.

> **Note:** An active internet connection is required initially to load the necessary libraries (React, Tailwind CSS, FontAwesome).

---

## ✨ Key Features

### 📋 Personnel & Roster Management
*   **Comprehensive Roster:** Manage names, congregations, and appointments (Elder, MS, Exemplary).
*   **Key Man Teams:** Organically group attendants under "Key Men" using intuitive drag-and-drop.
*   **Capabilities & Permissions:** Assign specific permissions (e.g., Auditorium, Lobby, Parking) to ensure brothers are only assigned where they are qualified.
*   **Custom Tags:** Create tags (e.g., "Bus Rider") to apply bulk constraints like restricted areas or specific shift unavailability.
*   **CSV Import:** Rapidly load your entire roster from a spreadsheet.

### ⚙️ Deep Configuration
*   **Dynamic Layout:** Fully customize **Areas** (Departments), **Shifts** (Time Slots), and **Positions**.
*   **Mirroring/Linking:** Link positions together (e.g., Security Walk 1 mirrored in the Lobby) to automatically sync assignments.
*   **Rules Engine:** Configure the "brain" of the scheduler:
    *   **Severity Control:** Set violations (like double-booking) as a hard **Block (Red)** or a **Warning (Yellow)**.
    *   **Auditorium Relief Mode:** Dynamically allow Auditorium staff to rotate into other departments while maintaining minimum coverage (Section Safety).
    *   **Fairness Constraints:** Limit "Anchor" pulls and set a "Max Work Load" percentage.

### 📅 Intelligent Scheduling
*   **Auto-Fill:** A sophisticated algorithm that fills your entire schedule in seconds, respecting all rules, qualifications, and fairness constraints.
*   **Drag-and-Drop:** Quickly assign brothers by grabbing them from the sidebar and dropping them directly into any slot.
*   **Conflict Detection:** Real-time feedback prevents double-bookings, unavailability overlaps, and qualification mismatches.
*   **One-Click Reset:** Quickly reset the entire grid with **Clear All** or surgically remove only automated assignments with **Clear Auto-Fills**.
*   **Find Replacement:** A smart search tool to find the perfect, free substitute for any specific slot.
*   **Undo/Redo:** Experiment freely with a 50-step history buffer.

### 📊 Views & Reporting
*   **Schedule Grid:** The master interactive command center.
*   **Department View:** Timeline reports filtered by Area, optimized for department overseers.
*   **Assignment Slips:** Generate and print individual "cut-out" slips for every volunteer.
*   **Time Stats:** Monitor "Minutes Away" and "% Missed" to ensure no one is overworked.
*   **Decision Log:** Audit the exact logic used by the Auto-Fill engine.

---

## 🔒 Security & Privacy

*   **100% Client-Side:** Your data never leaves your computer. No servers, no databases, no tracking.
*   **AES Encryption:** Export your work as a password-protected `.lock` file using industry-standard AES-256 encryption.
*   **Auto-Save:** Progress is automatically saved to your browser's local storage.
*   **Private by Design:** Built specifically to protect the privacy of personnel data.

---

## 🛠️ Tech Stack

*   **Frontend:** React 18 (SPA)
*   **Styling:** Tailwind CSS (with Dark Mode support)
*   **Encryption:** CryptoJS (AES)
*   **Icons:** FontAwesome 6.4
*   **Transpilation:** Babel (Standalone)

---

## 📖 How to Use

### 1. Initial Configuration
Before adding people, set up the structure of your assembly in the **Config** tab:
*   **Areas:** Define departments (e.g., Auditorium, Exterior, Dining Room).
*   **Shifts:** Set your session times.
*   **Positions:** Create specific posts. Use "Auditorium" type for all-day anchors or "Rotational" for shift-based spots.
*   **Rules:** Fine-tune the logic. Enable "Avoid Consecutive Shifts" or "Auditorium Relief Mode" if needed.

### 2. Building the Roster
*   Go to the **Roster** tab.
*   **Manual Entry:** Use the form to add brothers. Set their Role and Permissions.
*   **CSV Import:** Format your CSV as: *First Name, Last Name, Gender, Full Name, Age, Appointment, Mobile, Key Man*.
*   **Grouping:** Drag and drop names onto a "Key Man" header to assign them to that team.

### 3. Creating the Schedule
*   Go to the **Schedule** tab.
*   **Auto-Fill:** Click **Auto-Fill** to generate the initial schedule.
*   **Manual Tweaks:** Click any cell to select a brother.
    *   **Green Background:** Perfect match / Recommended.
    *   **Yellow/Red:** Indicates a warning or rule violation.
*   **Find Replacement:** Use the 🔍 icon to see a filtered list of qualified, free volunteers for that specific time.

### 4. Review & Print
*   **Balance Check:** Visit **Time Stats** to see who is missing the most of the program.
*   **Print Slips:** Go to **Slips** and use `Ctrl+P` to print all assignment slips.
*   **Overseer Reports:** Use the **Depts** view to print specific schedules for department leads.
