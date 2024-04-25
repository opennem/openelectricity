// Usage: import { whichBrowser, isSafari } from 'lib/utils/browser-detect';
// Description: Use this inside `onMount` to detect the browser and do something based on the browser type.

function whichBrowser() {
	if (isFirefox()) {
		return 'Firefox';
	} else if (isEdge()) {
		return 'Edge';
	} else if (isIE()) {
		return 'Internet Explorer';
	} else if (isOpera()) {
		return 'Opera';
	} else if (isVivaldi()) {
		return 'Vivalid';
	} else if (isChrome()) {
		return 'Chrome';
	} else if (isSafari()) {
		return 'Safari';
	} else {
		return 'Unknown';
	}
}

function agentHas(keyword) {
	return navigator.userAgent.toLowerCase().search(keyword.toLowerCase()) > -1;
}

function isIE() {
	return !!document.documentMode;
}

function isSafari() {
	return (
		(!!window.ApplePaySetupFeature || !!window.safari) &&
		agentHas('Safari') &&
		!agentHas('Chrome') &&
		!agentHas('CriOS')
	);
}

function isChrome() {
	return agentHas('CriOS') || agentHas('Chrome') || !!window.chrome;
}

function isFirefox() {
	return agentHas('Firefox') || agentHas('FxiOS') || agentHas('Focus');
}

function isEdge() {
	return agentHas('Edg');
}

function isOpera() {
	return agentHas('OPR');
}

function isVivaldi() {
	return agentHas('Vivaldi');
}

export { whichBrowser, isSafari };
