let n = Date.now();
// generate ids for html elements in the same app
export default function getSeqId() {
	return 'oe-' + (++n).toString(36);
}
