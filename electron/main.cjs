const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

// Using the OS AppData/Documents folder for safe, permanent storage
const userDataPath = app.getPath('userData')
const backupFilePath = path.join(userDataPath, 'scheduler_database.json')

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            // Set to true because we are mixing local file access in dev mode
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    // In production, load the built HTML file
    // In dev mode, load the Vite dev server
    if (process.env.NODE_ENV === 'development') {
        win.loadURL('http://localhost:5173')
        win.webContents.openDevTools()
    } else {
        // Correct pathing for Electron builder output
        win.loadFile(path.join(__dirname, '../dist/index.html'))
    }
}

// ------ NATIVE FILE SYSTEM HANDLERS ------
ipcMain.handle('save-data', async (event, data) => {
    try {
        fs.writeFileSync(backupFilePath, JSON.stringify(data, null, 2))
        return { success: true }
    } catch (err) {
        console.error('Failed to save data natively:', err)
        return { success: false, error: err.message }
    }
})

ipcMain.handle('load-data', async (event) => {
    try {
        if (fs.existsSync(backupFilePath)) {
            const rawData = fs.readFileSync(backupFilePath, 'utf-8')
            return { success: true, data: JSON.parse(rawData) }
        }
        return { success: true, data: null } // No file yet
    } catch (err) {
        console.error('Failed to load data natively:', err)
        return { success: false, error: err.message }
    }
})

// ------ APP LIFECYCLE ------
app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
