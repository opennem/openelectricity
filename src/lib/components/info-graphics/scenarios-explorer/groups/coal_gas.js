/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const fuelTechMap = {
	coal_gas: [
		'coal_black',
		'coal_brown',
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
	coal_gas: 'Coal & Gas'
};

/** @type {FuelTechCode[]} */
export const order = ['coal_gas'];
