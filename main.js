const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const lucida = require('lucida').default;




function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    }
  });

  win.loadFile('index.html');
}

ipcMain.handle('get-arls', async () => {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'arls.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return {};
  }
});

ipcMain.handle('download-qobuz', async (event, { url }) => {
  try {
    const arls = JSON.parse(fs.readFileSync('arls.json', 'utf8'));
    let lastError;

    for (const [name, arl] of Object.entries(arls)) {
      try {
        const qobuz = lucida.qobuz;
        await qobuz.login(arl);
        const result = await qobuz.download(url);
        return { success: true, account: name, path: result };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error("No valid ARL worked");
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();
});
