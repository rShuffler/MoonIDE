const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Файловые операции
    openFile: () => ipcRenderer.invoke('open-file'),
    saveFile: (data) => ipcRenderer.invoke('save-file', data),
    
    // Управление окном
    minimize: () => ipcRenderer.invoke('window-minimize'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    close: () => ipcRenderer.invoke('window-close'),

    // Плагины
    openPlugins: () => ipcRenderer.invoke('open-plugins'),
    installPlugin: (plugin) => ipcRenderer.invoke('install-plugin', plugin),
    uninstallPlugin: (plugin) => ipcRenderer.invoke('uninstall-plugin', plugin),
    getInstalledPlugins: () => ipcRenderer.invoke('get-installed-plugins'),
    onPluginsStateUpdate: (callback) => {
        ipcRenderer.on('plugins-state-update', (event, installedPlugins) => {
            callback(installedPlugins);
        });
    }
}); 