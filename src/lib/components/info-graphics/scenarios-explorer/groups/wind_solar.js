/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const fuelTechMap = {
	wind_solar: ['wind', 'wind_offshore', 'solar_utility', 'solar_rooftop', 'solar_thermal']
};

/** @type {Object.<FuelTechCode, string>}} */
export const labels = {
	wind_solar: 'Wind & Solar'
};

/** @type {FuelTechCode[]} */
export const order = ['wind_solar'];
