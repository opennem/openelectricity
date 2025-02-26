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

	/** @type {MilestoneRecord | undefined} */
	latestMilestone = $derived(this.milestones[this.milestones.length - 1]);
}

export const recordState = new State();
