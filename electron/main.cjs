const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const CryptoJS = require('crypto-js')
const { machineIdSync } = require('node-machine-id')
const { autoUpdater } = require('electron-updater')

// Unique key per machine for local encryption
const MACHINE_KEY = machineIdSync()
const ENCRYPTION_MARKER = 'ENCRYPTED_V1:'

// Using the OS AppData/Documents folder for safe, permanent storage
const userDataPath = app.getPath('userData')
const backupFilePath = path.join(userDataPath, 'scheduler_database.json')

function encrypt(text) {
    return ENCRYPTION_MARKER + CryptoJS.AES.encrypt(text, MACHINE_KEY).toString()
}

function decrypt(ciphertext) {
    if (!ciphertext.startsWith(ENCRYPTION_MARKER)) return ciphertext // Not encrypted yet
    const actualCiphertext = ciphertext.replace(ENCRYPTION_MARKER, '')
    const bytes = CryptoJS.AES.decrypt(actualCiphertext, MACHINE_KEY)
    return bytes.toString(CryptoJS.enc.Utf8)
}

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
        const encrypted = encrypt(JSON.stringify(data, null, 2))
        fs.writeFileSync(backupFilePath, encrypted)
        return { success: true }
    } catch (err) {
        console.error('Failed to save data natively:', err)
        return { success: false, error: err.message }
    }
})

ipcMain.handle('load-data', async (event) => {
    try {
        if (fs.existsSync(backupFilePath)) {
            const rawContent = fs.readFileSync(backupFilePath, 'utf-8')
            const decrypted = decrypt(rawContent)
            return { success: true, data: JSON.parse(decrypted) }
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
    
    // Check for updates after window is created
    autoUpdater.checkForUpdatesAndNotify()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

// ------ AUTO UPDATER EVENTS ------
autoUpdater.on('update-available', () => {
    console.log('Update available.')
})

autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded and is ready to install.`,
        buttons: ['Restart and Install', 'Later']
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
