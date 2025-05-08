const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let pluginsWindow;

// Путь к файлу конфигурации плагинов
const pluginsConfigPath = path.join(app.getPath('userData'), 'plugins.json');

// Функция для загрузки конфигурации плагинов
function loadPluginsConfig() {
    try {
        if (fs.existsSync(pluginsConfigPath)) {
            const data = fs.readFileSync(pluginsConfigPath, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading plugins config:', error);
    }
    return { installedPlugins: [] };
}

// Функция для сохранения конфигурации плагинов
function savePluginsConfig(config) {
    try {
        fs.writeFileSync(pluginsConfigPath, JSON.stringify(config, null, 2));
    } catch (error) {
        console.error('Error saving plugins config:', error);
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.loadFile('index.html');
}

function createPluginsWindow() {
    pluginsWindow = new BrowserWindow({
        width: 800,
        height: 600,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    pluginsWindow.loadFile('plugins.html');

    // Отправляем список установленных плагинов после загрузки страницы
    pluginsWindow.webContents.on('did-finish-load', () => {
        const config = loadPluginsConfig();
        pluginsWindow.webContents.send('plugins-state-update', config.installedPlugins);
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Обработчики IPC
ipcMain.handle('open-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const content = fs.readFileSync(filePath, 'utf8');
        return { content, filePath };
    }
    return null;
});

ipcMain.handle('save-file', async (event, data) => {
    let filePath = data.filePath;

    if (!filePath) {
        const result = await dialog.showSaveDialog(mainWindow, {
            filters: [
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled) return null;
        filePath = result.filePath;
    }

    fs.writeFileSync(filePath, data.content);
    return filePath;
});

ipcMain.handle('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.handle('window-close', () => {
    mainWindow.close();
});

// Обработчики плагинов
ipcMain.handle('open-plugins', () => {
    createPluginsWindow();
});

ipcMain.handle('install-plugin', async (event, plugin) => {
    const config = loadPluginsConfig();
    if (!config.installedPlugins.includes(plugin)) {
        config.installedPlugins.push(plugin);
        savePluginsConfig(config);
    }
    return true;
});

ipcMain.handle('uninstall-plugin', async (event, plugin) => {
    const config = loadPluginsConfig();
    config.installedPlugins = config.installedPlugins.filter(p => p !== plugin);
    savePluginsConfig(config);
    return true;
});

ipcMain.handle('get-installed-plugins', async () => {
    const config = loadPluginsConfig();
    return config.installedPlugins;
}); 