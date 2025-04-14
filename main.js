// main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import Lucida from 'lucida';
import Qobuz from 'lucida/streamers/qobuz/main.js';

// Get __dirname in an ES module environment
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
    // Read tokens (ARLs) from file
    const data = await fs.readFile(path.join(__dirname, 'arls.json'), 'utf8');
    const tokens = JSON.parse(data);
    let lastError;
    let successfulAccount;
    let savedFilePath;

    // Cycle through each token
    for (const [name, token] of Object.entries(tokens)) {
      try {
        // Instantiate a Lucida instance, passing the current token to Qobuz via the constructor
        const lucidaInstance = new Lucida({
          modules: {
            qobuz: new Qobuz({
              token: token // Token passed as option per module's API design
            })
          }
        });
        
        // Login. For modules that support tokens through their constructor, this ensures proper setup.
        await lucidaInstance.login();
        
        // Resolve the track/album from the URL.
        const track = await lucidaInstance.getByUrl(url);
        
        // Get the stream data (this example assumes a FLAC file).
        const streamData = await track.getStream();
        
        // Save the file. Here we simply save it as "downloaded_file.flac" in the app folder.
        savedFilePath = path.join(__dirname, 'downloaded_file.flac');
        await fs.writeFile(savedFilePath, streamData.stream);
        
        successfulAccount = name;
        
        // Disconnect if needed (only necessary for modules that maintain persistent connections)
        if (typeof lucidaInstance.disconnect === 'function') {
          await lucidaInstance.disconnect();
        }
        
        return { success: true, account: successfulAccount, path: savedFilePath };
      } catch (err) {
        // If the login or download fails for this token, keep the error and try the next token.
        lastError = err;
      }
    }
    
    // If none of the tokens succeeded, throw the last encountered error.
    throw lastError || new Error("No valid token succeeded");
  } catch (err) {
    return { success: false, error: err.message };
  }
});
