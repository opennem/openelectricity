class State {
	/** @type {boolean} */
	error = $state(false);

	/** @type {string | undefined} */
	id = $state();

	/** @type {MilestoneRecord[] | undefined} */
	recordIds = $state([]);

	/** @type {number | undefined} */
	selectedTime = $state();

	/** @type {MilestoneRecord[]} */
	milestones = $state([]);

	/** @type {MilestoneRecord | undefined} */
	selectedMilestone = $derived(this.milestones.find((m) => m.time === this.selectedTime));
}

export const recordState = new State();
