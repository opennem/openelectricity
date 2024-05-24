const mapOptions = (items) =>
	items.map((item) => {
		return {
			value: item,
			label: item.split('_').join(' ')
		};
	});

export default mapOptions;
