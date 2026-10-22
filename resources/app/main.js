'use strict';
// Оболочка Electron: окно, значок в трее (область со стрелкой ^), уведомления, автозапуск
const {app, BrowserWindow, Tray, Menu, Notification, shell, nativeImage} = require('electron');
const path = require('path'), fs = require('fs');
const {start} = require('./server');

if (!app.requestSingleInstanceLock()) app.quit(); else init();

function init() {
  app.setAppUserModelId('com.gametracker.app');
  let win, tray, srv, quitting = false, nowItem = 'Сейчас ничего не запущено', tip = 'Game Tracker';
  const hidden = process.argv.includes('--hidden');
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
  const trayIcon = (() => { const i = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.ico')); return i.isEmpty() ? icon.resize({width: 20, height: 20}) : i; })();

  // автозапуск: при входе в Windows приложение стартует свёрнутым в трей. Параметры должны совпадать при записи и чтении.
  const LOGIN = () => ({path: process.execPath, args: process.defaultApp ? [path.resolve(process.argv[1] || '.'), '--hidden'] : ['--hidden']});
  const getAuto = () => { try { return app.getLoginItemSettings(LOGIN()).openAtLogin; } catch { return false; } };
  const setAuto = on => { try { app.setLoginItemSettings({openAtLogin: !!on, ...LOGIN()}); } catch {} };

  function show() { if (!win) return; if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
  function notify(title, body) { try { if (Notification.isSupported()) new Notification({title, body, icon, silent: true}).show(); } catch {} }
  function menu() {
    if (!tray) return;
    tray.setContextMenu(Menu.buildFromTemplate([
      {label: 'Открыть Game Tracker', click: show}, {type: 'separator'},
      {label: nowItem, enabled: false}, {type: 'separator'},
      {label: 'Запускать вместе с Windows', type: 'checkbox', checked: getAuto(), click: i => setAuto(i.checked)},
      {label: 'Выход', click: () => { quitting = true; app.quit(); }}
    ]));
  }
  function makeTray() {
    try { tray?.destroy(); } catch {}
    tray = new Tray(trayIcon); tray.setToolTip(tip); tray.on('click', show); tray.on('double-click', show); menu();
  }
  function setTip(t) { tip = t; try { tray?.setToolTip(t); } catch {} }

  app.on('second-instance', show);
  app.whenReady().then(async () => {
    const dataDir = path.join(app.getPath('userData'), 'data');
    // первый запуск установленного приложения: включаем автозапуск (отключается в Настройках или в меню значка)
    try {
      const flag = path.join(app.getPath('userData'), 'first-run.flag');
      if (!process.defaultApp && !fs.existsSync(flag)) { setAuto(true); fs.mkdirSync(path.dirname(flag), {recursive: true}); fs.writeFileSync(flag, new Date().toISOString()); }
    } catch {}
    srv = await start({
      dataDir, port: 0,
      hooks: {getAutostart: getAuto, setAutostart: on => { setAuto(on); menu(); }, openData: () => shell.openPath(dataDir)}
    });
    win = new BrowserWindow({width: 1360, height: 860, minWidth: 900, minHeight: 600, backgroundColor: '#000000', autoHideMenuBar: true, show: !hidden, icon, title: 'Game Tracker'});
    win.setMenuBarVisibility(false);
    win.loadURL('http://127.0.0.1:' + srv.port);
    win.webContents.setWindowOpenHandler(({url}) => { shell.openExternal(url); return {action: 'deny'}; });
    win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('http://127.0.0.1:' + srv.port)) { e.preventDefault(); shell.openExternal(url); } });
    // закрытие окна сворачивает в трей, чтобы часы считались дальше
    win.on('close', e => { if (!quitting) { e.preventDefault(); win.hide(); } });

    makeTray();
    // при автозапуске панель задач может быть ещё не готова: создаём значок повторно, чтобы он точно появился
    if (hidden) { setTimeout(makeTray, 8000); setTimeout(makeTray, 30000); }

    const fmt = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h} ч ${m} мин` : `${m} мин`; };
    srv.events.on('event', e => {
      if (e.type === 'start') { nowItem = 'Играете: ' + e.name; setTip('Game Tracker: ' + e.name); menu(); notify('Время игры считается', e.name); }
      else if (e.type === 'end') { nowItem = 'Сейчас ничего не запущено'; setTip('Game Tracker'); menu(); notify('Сессия окончена', `${e.name}: ${fmt(e.seconds)}`); }
      else if (e.type === 'added') notify('Новая игра в библиотеке', e.name);
    });
  });
  app.on('before-quit', () => { quitting = true; try { srv?.close(); } catch {} });
  app.on('window-all-closed', () => {});
}
