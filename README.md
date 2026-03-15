# Secure Circuit Assembly Scheduler

A powerful browser application designed to streamline the scheduling of attendants for Jehovah's Witnesses Circuit Assemblies and Regional Conventions.

---

## 🚀 Quick Start for Users

1.  **Download** the `schedule.html` file from this repository.
2.  **Open** the file in any modern web browser.
3.  **Start Scheduling!** No installation or server is required.

---

## 🛠️ Development Workflow

We have moved to a modern React development workflow while maintaining the ability to output a single portable HTML file.

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   npm

### Setup
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Development
Start the local development server with hot-reloading:
```bash
npm run dev
```

### Building for Production
To generate the single-file `schedule.html`:
1.  Run the build command:
    ```bash
    npm run build
    ```
2.  The optimized, portable file will be generated at `dist/index.html`.
3.  Copy it to the root if needed: `cp dist/index.html schedule.html`.

---

## ✨ Key Features

*   **Intelligent Auto-Fill:** Advanced heuristic fills slots based on qualifications, fairness, and custom rules.
*   **100% Client-Side:** No servers or databases. Your data stays on your machine.
*   **AES Encryption:** Export/Import schedule data with password protection.
*   **Responsive Design:** Optimized for both Desktop (Grid) and Mobile (Cards) use.
*   **Localization:** Built-in support for English, Spanish, French, Portuguese, Tagalog, and Italian.
*   **Blueprint System:** Save and load hall layouts as reusable templates.

---

## 🔒 Security & Privacy

*   **Private by Design:** Built specifically to protect the privacy of personnel data.
*   **Zero Tracking:** No analytics or external requests (except for FontAwesome icons).
*   **Encrypted Exports:** All exported files use AES-256 encryption.

---

## 🏗️ Tech Stack

*   **Framework:** React 18
*   **Language:** TypeScript
*   **Build Tool:** Vite + `vite-plugin-singlefile`
*   **Styling:** Tailwind CSS
*   **Icons:** FontAwesome
*   **Encryption:** CryptoJS
