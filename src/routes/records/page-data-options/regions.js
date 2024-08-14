const regionOptions = [
	{
		value: '_all',
		label: 'All Regions',
		children: [
			{
				value: 'nem',
				label: 'National Electricity Market (NEM)',
				children: [
					{
						value: 'nsw1',
						label: 'New South Wales'
					},
					{
						value: 'qld1',
						label: 'Queensland'
					},
					{
						value: 'sa1',
						label: 'South Australia'
					},
					{
						value: 'tas1',
						label: 'Tasmania'
					},
					{
						value: 'vic1',
						label: 'Victoria'
					}
				]
			}
		]
	}
];

export default regionOptions;
