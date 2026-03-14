# Attendant Scheduler - AI Context & Knowledge Base

This document contains key information about the *Attendant Scheduler* project, its architecture, and recent changes, to assist future AI sessions in understanding the codebase immediately.

## Project Overview
- **Name:** Attendant Scheduler (v3.6.11+)
- **Purpose:** A purely client-side React PWA and Electron tool designed for scheduling attendant volunteers for Jehovah's Witnesses Circuit Assemblies and Regional Conventions.
- **Framework:** React + Vite + Tailwind CSS.
- **Data Persistence:** Local JSON exports (`.assemblyhall`), CSV imports, and Excel (`.xlsx`) or PNG report generation.

## Key Technical Decisions
1. **No Backend:** The application is entirely client-side. Data states are passed down from `App.jsx` and imported/exported by the user as physical files.
2. **Alerts & Modals:** Native OS blocking dialogs (`window.alert` and `window.confirm`) are strictly prohibited for UI flow.
   - Use `toast` from `react-hot-toast` for success/error/info notifications.
   - Use the `useConfirm()` hook (provided by `ConfirmProvider` in `App.jsx`) context to asynchronously await user confirmations (e.g., `if (await confirm('Are you sure?')) { ... }`).
3. **Styling:** Tailwind CSS with explicit Dark Mode support (`dark:bg-slate-800`, `dark:text-white`).

## Core Components
- **`App.jsx`**: Global state holder. Mounts the `ConfirmProvider` and `Toaster`. Switches between the main active views.
- **`ConfigView.jsx`**: Handles generic configuration, allowing the user to create "Blueprints" (templates) mapping out Areas, Shifts, and logical Positions.
- **`RosterView.jsx`**: (Recently refactored into sub-components in `src/components/roster/`) Manages the volunteer list. Imports CSVs using `CSVMapperModal`. Defines capabilities/caps (`lobby`, `backstage`, `keyman`) and unavailabilities.
- **`ScheduleView.jsx`**: The core matrix logic. Assigns personnel to either Rotational (shifts) or Auditorium (all-day) positions. Includes a complex Weighted Scoring Auto-Fill logic script. Has conflict checking for double-bookings.
- **`DepartmentView.jsx` / `PrintView.jsx`**: Read-only, print-friendly reports generating individual Key Man printouts or global schedules.

## Recent Feature Work Details (March 2026)
- **Custom Dialogs:** We implemented dynamic custom dialogs by substituting all calls to native `alert()` and `confirm()` throughout `ConfigView`, `ScheduleView`, `RosterView`, `TagsView`, `CSVMapperModal`, and `DepartmentView`. 
- **Merge Conflict Resolution:** A massive refactor of `RosterView` into `RosterForm`, `RosterTable`, `EmptyRoster`, and `MergeModal` was merged in from the `main` GitHub branch and reconciled with the custom dialog implementation.
- **Deploy Artifact:** A clean build was executed via `npm run build:nocache`, ensuring `schedule.html` includes all the latest features.
