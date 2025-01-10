class State {
	/** @type {string | null} */
	id = $state(null);

	/** @type {MilestoneRecord | null} */
	record = $state(null);

	/** @type {MilestoneRecord[] | undefined} */
	recordIds = $state([]);

	/** @type {MilestoneRecord | null} */
	recordByRecordId = $derived.by(() => {
		if (!this.id) return null;
		let idArr = this.id.split('.');
		// length:
		// 5: network only without fueltech
		// 6: network only with fueltech
		// 7: network with network_region and fueltech
		let isNetworkOnlyWithoutFueltech = idArr.length === 5;
		let isNetworkOnlyWithFueltech = idArr.length === 6;
		let isNetworkWithNetworkRegionAndFueltech = idArr.length === 7;

		let network_id = idArr[1];
		let network_region = isNetworkWithNetworkRegionAndFueltech ? idArr[2] : null;
		let fueltech_id = /** @type {FuelTechCode | undefined} */ (
			isNetworkOnlyWithoutFueltech ? undefined : isNetworkOnlyWithFueltech ? idArr[2] : idArr[3]
		);
		let metric = isNetworkOnlyWithoutFueltech
			? idArr[2]
			: isNetworkOnlyWithFueltech
				? idArr[3]
				: idArr[4];
		let period = isNetworkOnlyWithoutFueltech
			? idArr[3]
			: isNetworkOnlyWithFueltech
				? idArr[4]
				: idArr[5];
		let aggregate = isNetworkOnlyWithoutFueltech
			? idArr[4]
			: isNetworkOnlyWithFueltech
				? idArr[5]
				: idArr[6];

		return {
			network_region,
			network_id,
			fueltech_id,
			metric,
			period,
			aggregate,
			record_id: this.id
		};
	});
}

export const recordState = new State();
