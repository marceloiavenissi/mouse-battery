const ExtensionUtils = imports.misc.extensionUtils;
const kPower = ExtensionUtils.getCurrentExtension().imports.kPower;
const Log = kPower.Log;
const Main = imports.ui.main;

var btDevicesBattIndicator;
function enable() {
	Log("Enable");
	btDevicesBattIndicator = new kPower.mBattIndicator();
	Main.panel.addToStatusArea('BtDevicesBattIndicator', btDevicesBattIndicator, 1);
}

function disable() {
	Log("Disable");
	kPower.dbusCon.signal_unsubscribe(btDevicesBattIndicator.subIdAdd);
	kPower.dbusCon.signal_unsubscribe(btDevicesBattIndicator.subIdRem);
	btDevicesBattIndicator._proxy = null;
	btDevicesBattIndicator.reset();
	btDevicesBattIndicator.destroy();
	btDevicesBattIndicator = null;
}
