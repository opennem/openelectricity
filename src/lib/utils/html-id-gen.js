let n = Date.now();
// numbering html elements in the same app
export default function getSeqId() {
	return 'oe-' + (++n).toString(36);
}
