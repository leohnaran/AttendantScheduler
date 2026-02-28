const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electronAPI',
    {
        saveData: (data) => ipcRenderer.invoke('save-data', data),
        loadData: () => ipcRenderer.invoke('load-data')
    }
)
