const { app, BrowserWindow, globalShortcut } = require('electron')
const path = require('path')

const isDev = process.argv.includes('--dev')

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    backgroundColor: '#070B12',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // ESC exits fullscreen; F11 toggles it
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape') {
      win.setFullScreen(false)
    }
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen())
    }
  })
}

app.whenReady().then(() => {
  createWindow()

  // Cmd+Q / Ctrl+Q to quit
  globalShortcut.register('CommandOrControl+Q', () => app.quit())
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  app.quit()
})
