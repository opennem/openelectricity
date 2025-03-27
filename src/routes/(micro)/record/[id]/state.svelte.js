export class MicroRecordState {
	/** @type {{ date: Date, time: number, value: number } | undefined} */
	focusRecord = $state(undefined);
}

export const microRecordState = new MicroRecordState();
