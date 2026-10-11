const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const services = require('./services');

/** Общий билдер итогового буфера */
async function buildQr(payload) {
  let buf = await services.generateQr(payload);
  buf = await services.addLogo(buf, payload.logoPath, payload.logoRatio);
  return buf;
}

/** Обёртка для IPC: возвращаем { ok } вместо throw */
function safe(handler) {
  return async (event, arg) => {
    try {
      return { ok: true, ...(await handler(event, arg)) };
    } catch (err) {
      return { ok: false, error: err.message || 'Неизвестная ошибка', code: err.code };
    }
  };
}

function registerIpc() {
  ipcMain.handle('qr:generate', safe(async (_e, p) => {
    const buf = await buildQr(p);
    return { dataUrl: `data:image/png;base64,${buf.toString('base64')}` };
  }));

  ipcMain.handle('qr:save', safe(async (_e, p) => {
    const buf = await buildQr(p);
    const filePath = await services.saveFile(buf, p.filePath);
    return { filePath };
  }));

  ipcMain.handle('logo:pick', async () => {
    const r = await dialog.showOpenDialog({
      title: 'Выберите логотип',
      filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      properties: ['openFile']
    });
    if (r.canceled || !r.filePaths[0]) return null;
    try {
      await services.validateLogo(r.filePaths[0]);
      return { ok: true, path: r.filePaths[0] };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('dialog:save', async (_e, defaultName) => {
    const r = await dialog.showSaveDialog({
      title: 'Сохранить QR-код',
      defaultPath: defaultName || 'qr-code.png',
      filters: [{ name: 'PNG', extensions: ['png'] }]
    });
    return r.canceled ? null : r.filePath;
  });

  ipcMain.handle('win:min',   (e) => BrowserWindow.fromWebContents(e.sender)?.minimize());
  ipcMain.handle('win:max',   (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    if (!w) return;
    w.isMaximized() ? w.unmaximize() : w.maximize();
  });
  ipcMain.handle('win:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close());
}

function createWindow() {
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    frame: false,
    backgroundColor: '#0b0d12',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, 'renderer/index.html'));
  win.once('ready-to-show', () => win.show());
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});