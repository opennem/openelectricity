/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const fuelTechMap = {
	gas: [
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_steam',
		'gas_wcmg',
		'gas_hydrogen'
	]
};

/** @type {Object.<FuelTechCode, string>}} */
export const labels = {
	gas: 'Gas'
};

/** @type {FuelTechCode[]} */
export const order = ['gas'];
