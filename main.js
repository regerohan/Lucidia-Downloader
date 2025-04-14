// main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import Lucida from 'lucida';
import Qobuz from 'lucida/streamers/qobuz/main.js';

// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

app.whenReady().then(createWindow);

ipcMain.handle('download-qobuz', async (event, { url }) => {
  try {
    // Read ARLs from file
    const data = await fs.readFile(path.join(__dirname, 'arls.json'), 'utf8');
    const arls = JSON.parse(data);
    let lastError;
    let successfulAccount;
    let savedFilePath;

    // Cycle through each ARL
    for (const [name, arl] of Object.entries(arls)) {
      try {
        // Create a Lucida instance with Qobuz configured with the current ARL token
        const lucidaInstance = new Lucida({
          modules: {
            qobuz: new Qobuz({
              arl: arl
            })
          }
        });
        
        // Login – using modules which use the tokens configuration
        await lucidaInstance.login();
        
        // Resolve the track/album from the URL
        const track = await lucidaInstance.getByUrl(url);
        
        // Get the stream data (this example assumes a FLAC file)
        const streamData = await track.getStream();
        
        // Save the file. Here, for simplicity, we save it as "downloaded_file.flac" in the app folder.
        savedFilePath = path.join(__dirname, 'downloaded_file.flac');
        await fs.writeFile(savedFilePath, streamData.stream);
        
        successfulAccount = name;
        
        // Disconnect if needed (only necessary for persistent connections)
        if (typeof lucidaInstance.disconnect === 'function') {
          await lucidaInstance.disconnect();
        }
        
        // Return success result
        return { success: true, account: successfulAccount, path: savedFilePath };
      } catch (err) {
        // Log error and move on to the next ARL
        lastError = err;
      }
    }
    throw lastError || new Error("No valid ARL succeeded");
  } catch (err) {
    return { success: false, error: err.message };
  }
});
