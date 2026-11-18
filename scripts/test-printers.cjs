const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const w = new BrowserWindow({ show: false });
  await w.loadURL('data:text/html,<h1>teste</h1>');
  console.log('electron version:', process.versions.electron);

  console.log('typeof webContents.getPrinters =', typeof w.webContents.getPrinters);
  console.log('typeof webContents.getPrintersAsync =', typeof w.webContents.getPrintersAsync);

  try {
    const lista = await w.webContents.getPrinters();
    console.log('getPrinters() ->', JSON.stringify(lista, null, 2));
  } catch (e) {
    console.log('getPrinters() ERRO:', e && e.message);
  }

  try {
    const lista2 = await w.webContents.getPrintersAsync();
    console.log('getPrintersAsync() ->', JSON.stringify(lista2, null, 2));
  } catch (e) {
    console.log('getPrintersAsync() ERRO:', e && e.message);
  }

  app.quit();
});
