const Lang = imports.lang;
const { St, Gio, UPowerGlib: UPower } = imports.gi;
const xml ='<node>\
   <interface name="org.freedesktop.UPower.Device">\
      <property name="Type" type="u" access="read" />\
      <property name="State" type="u" access="read" />\
      <property name="Percentage" type="d" access="read" />\
      <property name="TimeToEmpty" type="x" access="read" />\
      <property name="TimeToFull" type="x" access="read" />\
      <property name="IsPresent" type="b" access="read" />\
      <property name="IconName" type="s" access="read" />\
   </interface>\
</node>';

const PowerManagerProxy = Gio.DBusProxy.makeProxyWrapper(xml);
const BUS_NAME = 'org.freedesktop.UPower';
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Clutter    = imports.gi.Clutter;
/**
---------------------------------------------------------------
Devices types

https://lazka.github.io/pgi-docs/#UPowerGlib-1.0/enums.html

The device type.

UNKNOWN = 0

LINE_POWER = 1

TABLET = 10

COMPUTER = 11

GAMING_INPUT = 12

LAST = 13

BATTERY = 2

UPS = 3

MONITOR = 4

MOUSE = 5

KEYBOARD = 6

PDA = 7

PHONE = 8

MEDIA_PLAYER = 9
-------------------------------------------------------------
Icons

https://developer.gnome.org/icon-naming-spec/

*/

var dbusCon;

var mBattIndicator = new Lang.Class({

	Name : "BtDevicesBattIndicator",
	Extends: PanelMenu.Button,

	_init: function () {
		Log("Init mBattIndicator");

		this.parent(0.0, "btDevicesBattIndicator");

		var hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box bt-mouse-batt-hbox' });
		this.icon = new St.Icon({ icon_name: 'input-mouse',
					 style_class: 'system-status-icon bt-mouse-batt-icon' });
		hbox.add_child(this.icon);

		this.buttonText = new St.Label({
				text: _('%'),
				y_align: Clutter.ActorAlign.CENTER,
				x_align: Clutter.ActorAlign.START
		});
		hbox.add_child(this.buttonText);

		this.actor.add_child(hbox);

		this.entryItem = new PopupMenu.PopupMenuItem("-- N/A --");
		this.menu.addMenuItem(this.entryItem);
		this.actor.hide();

		Log('dev listener');
		var uPower_proxy = new PowerManagerProxy(
			Gio.DBus.system,
			BUS_NAME,
			'/org/freedesktop/UPower',
			(proxy,error)=>{
				Log('+ _devConnectionListener +')
					if (error) {
						Log("PANIC");
						Log(error.message);
					}
			});

		dbusCon = uPower_proxy.get_connection();

		var iname = 'org.freedesktop.UPower';
		var sender = 'org.freedesktop.UPower' ;

		this.arrDevices = this.findDevices();
		this._newProxy();
		this.subIdAdd = dbusCon.signal_subscribe(sender,iname,'DeviceAdded',null, null,0,() => {
				Log('Dev added')
				this.arrDevices = this.findDevices();
				this._newProxy();
			});
		this.subIdRem = dbusCon.signal_subscribe(sender,iname,'DeviceRemoved',null, null,0,() => {
				var newListDevices = this.findDevices();
				Log('Hold on! Something has been removed')
				if (newListDevices.length === 0) {
					Log("Too bad, so sad. It's your device");
					this._proxy = null;
					this.arrDevices = null;
					this.entryItem.label.set_text("Too bad, so sad. Device removed");
					this.buttonText.set_text('%');
					this.actor.hide();

				} else if (newListDevices[0].native_path != this.arrDevices[0].native_path) {
					Log("Bad news, device removed! Good news, found another one");
					this.arrDevices = newListDevices;
					this._proxy = null;
					this._newProxy();
				} else {
					Log("Wew!!! not your device");
				}
			});
	},

	findDevices : function () {
		Log("findDevices");
		var upowerClient = UPower.Client.new_full(null);
		var devices = upowerClient.get_devices();
		/*var i;
		for (i=0; i < devices.length; i++){
			if (devices[i].kind == UPower.DeviceKind.MOUSE){
				Log("Found: " + devices[i].model + " | " + devices[i].native_path);
			}
		}*/
		return devices;
	},

	_sync : function () {
		Log("_sync: begin" )
		var text = "";
		try {
			for (i=0; i < devices.length; i++){
				var percent = this.getBatteryStatus(this.arrDevices[i]);
				Log("_sync: " + this.arrDevices[i].model + " | " + this.arrDevices[i].native_path);
				text = this.arrDevices[i].model+ ": " + percent+"\n";
			}
			this.entryItem.label.set_text(text);
			this.buttonText.set_text(devices.length);
			this.actor.show();
		} catch (err) {
			Log("no batt found ");
			Log(err.message);
			text = "n/a";
		}
		Log(text);
	},

	getBatteryStatus : function (device) {
		Log("read battery info");
		try {
			device.refresh_sync(null);
		} catch (err) {
			Log("WTF: " + err.message);
		}
		var percentage = device.percentage +"%";
		Log(percentage);
		return percentage;
	},

	_newProxy : function(){
		Log("Create new DBusProxy");
		if (this.arrDevices.length === 0) {
			Log("Too bad, so sad, no bluetooth devices has been detected, no proxy");
		} else {
			if (this._proxy === undefined || this._proxy === null) {
				this._proxy = new	PowerManagerProxy(Gio.DBus.system,
									BUS_NAME,
									this.arrDevices[0].get_object_path(),
									(proxy, error) => {
										Log ("Proxy callback function");
										if (error) {
											Log("PANIC");
											Log(error.message);
											return;
										}
										this._proxy.connect('g-properties-changed',
											this._sync.bind(this));
										this._sync();
									}
								);
			} else {
				Log("Proxy existed");
			}
		}
	},

	reset : function (){
		this.entryItem.destroy();
		this.buttonText.destroy();
	}

});

var Log = function(msg) {
	log ("[mBatt] " + msg);
}
