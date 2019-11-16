const { app, BrowserWindow, Menu, MenuItem, globalShortcut, Notification } = require('electron')
const url = require('url')
const path = require('path')
const fs = require('fs')
const storage = require('electron-json-storage')

var urls = []
let wins = []
let appIndex = 0
let windowIndex = 0
let opened = []
let intervals = []
let history = []
let INTERVAL = 1000
let MAX_DURATION
let KEEP_IN_BACKGROUND
let bounds = { 'width': 1300, 'height': 900, 'x': 300, 'y': 30 }
var menu
let pageHistory = []

function readFromJson() {
	try {
		let data = fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8');
		const settings = JSON.parse(data)
		urls = settings.apps
		MAX_DURATION = settings.max_duration
		KEEP_IN_BACKGROUND = settings.keep_in_background
	} catch (e) {
		console.log(e)
	}

	// storage.setDataPath(__dirname)

	// storage.get('settings.json', (err, data) => {
	// 	if (err) {
	// 		console.error(err)
	// 	} else {
	// 		urls = data.apps
	// 		MAX_DURATION = data.max_duration
	// 		KEEP_IN_BACKGROUND = data.keep_in_background

	// 		createWindow()
	// 	}
	// });

	// setTimeout(() => {}, 100)
}

function createWindow() {
	readFromJson()

	submenu = []

	for (let i = 0; i < urls.length; i++) {
		let app = urls[i]
		submenu[i] = {
			'label': app[0],
			click() {
				updateURL(i)
			},
			'accelerator': 'CmdOrCtrl+' + (i + 1)
		}

		pageHistory[i] = []
	}

	submenu[urls.length] = {
		'label': 'Back',
		'accelerator': 'Alt+Backspace',
		click() {
			if (pageHistory[appIndex][0]) {
				urls[appIndex][1] = pageHistory[appIndex].pop()
				wins[windowIndex].loadURL(urls[appIndex][1])
			}
		}
	}

	updateMenu()
}

function createSubWindow(i) {
	try {
		wins[i] = new BrowserWindow({
			width: bounds['width'], height: bounds['height'], title: 'ChatHub', show: false
		})

		if (wins[windowIndex].isMaximized()) {
			wins[i].maximize()
		}

		wins[i].on('close', () => {
			app.quit()
		})

		wins[i].on('page-title-updated', () => {
			if (wins[i].webContents.getURL() != urls[i][1]) {
				pageHistory[i].push(urls[i][1])
				urls[i][1] = wins[i].webContents.getURL()
			}
		})

		let contextMenu = new Menu()
		let menuItems = [
			new MenuItem({
				'role': 'copy',
			}),
			new MenuItem({
				'role': 'paste',
			}),
			new MenuItem({
				'role': 'selectAll',
			})
		]

		for (var item of menuItems) {
			contextMenu.append(item)
		}

		wins[i].webContents.on('context-menu', (e) => {
			contextMenu.popup(wins[i])
		})

		if (KEEP_IN_BACKGROUND) {
			wins[i].setPosition(bounds['x'], bounds['y'])
		}

		wins[i].show()
		wins[i].loadURL(urls[i][1])

		opened[i] = true
		intervals[i] = 0
	} catch (err) {

	}
}

app.on('ready', () => {
	createWindow()
	createSubWindow(0)

	globalShortcut.register('Alt+right', () => {
		if (wins[appIndex].webContents.isFocused()) {
			updateURL((appIndex + 1) % urls.length)
		}
	})

	globalShortcut.register('Alt+left', () => {
		if (wins[appIndex].webContents.isFocused()) {
			if (appIndex == 0) {
				updateURL(urls.length - 1)
			} else {
				updateURL(appIndex - 1)
			}
		}
	})
})

app.on('quit', () => {

})

setInterval(() => {
	for (let i = 0; i < intervals.length; i++) {
		if (i != appIndex) {
			intervals[i] += INTERVAL;
		}
	}

	for (let i = 0; i < urls.length; i++) {
		if (intervals[i] >= MAX_DURATION) {
			wins[i] = null
			intervals[i] = 0
			opened[i] = false
		}
	}

}, INTERVAL)

function updateURL(newIndex) {
	if (KEEP_IN_BACKGROUND) {
		bounds = wins[windowIndex].webContents.getOwnerBrowserWindow().getBounds()

		if (!opened[newIndex]) {
			createSubWindow(newIndex)
		}

		wins[newIndex].setPosition(bounds['x'], bounds['y'])
		wins[newIndex].setSize(bounds['width'], bounds['height'])
		wins[newIndex].show()
		wins[windowIndex].hide()

		windowIndex = newIndex
	} else {
		urls[appIndex][1] = wins[windowIndex].webContents.getURL()
		wins[windowIndex].loadURL(urls[newIndex][1])
	}

	var index = history.indexOf(appIndex);
	if (index > -1) {
		history.splice(index, 1);
	}

	history.unshift(appIndex)
	updateMenu()

	intervals[newIndex] = 0
	appIndex = newIndex
}

function updateMenu() {
	menu = Menu.buildFromTemplate([
		{
			'label': 'File',
			'submenu': [
				{
					'label': 'Settings',
					'accelerator': 'CmdOrCtrl+,'
				},
				{
					'label': 'Refresh',
					click() {
						createWindow()
					}
				},
				{
					'type': 'separator'
				},
				{
					'role': 'quit',
					'accelerator': 'CmdOrCtrl+Q'
				}
			]
		},
		{
			'label': 'Edit',
			'submenu': [
				{
					'role': 'copy'
				},
				{
					'role': 'cut'
				},
				{
					'role': 'paste'
				},
				{
					'role': 'undo'
				},
				{
					'role': 'selectAll'
				}
			]
		},
		{
			'label': 'Switch',
			'submenu': submenu
		},
		{
			'label': 'View',
			'submenu': [
				{
					'label': 'Zoom In',
					'role': 'zoomIn'
				},
				{
					'label': 'Zoom Out',
					'role': 'zoomOut'
				},
				{
					'label': 'Reset Zoom',
					'role': 'resetZoom'
				},
				{
					'type': 'separator'
				},
				{
					'label': 'Background',
					'type': 'checkbox',
					'checked': true,
					click() {
						KEEP_IN_BACKGROUND = !KEEP_IN_BACKGROUND
					},
					'accelerator': 'CmdOrCtrl+B'
				}
			]
		},
		{
			'label': 'History',
			'submenu': getHistoryMenu()
		},
		{
			'role': 'help',
			'submenu': [
				{
					'label': 'Commands',
				},
				{
					'label': 'About'
				}
			]
		}
	])

	Menu.setApplicationMenu(menu)
}

function getHistoryMenu() {
	let historyMenu = []
	for (let i = 0; i < history.length; i++) {
		let index = history[i]
		historyMenu.push(
			{
				'label': urls[index][0],
				click() {
					updateURL(index)
				},
				'accelerator': 'Alt+' + (i + 1)
			}
		)
	}

	return historyMenu
}