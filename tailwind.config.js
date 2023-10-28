/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		fontFamily: {
			sans: ['DM Sans', 'sans-serif'],
			space: ['Space Grotesk', 'sans-serif']
		},
		screens: {
			sm: '768px',
			md: '1024px',
			lg: '1280px',
			xl: '1440px',
			'2xl': '1920px'
		},
		container: {
			padding: {
				DEFAULT: '2rem',
				sm: '2rem',
				md: '2rem',
				lg: '3rem',
				xl: '10rem',
				'2xl': '24rem'
			}
		},
		fontSize: {
			DEFAULT: '1.6rem',
			xs: '1.2rem',
			sm: '1.4rem',
			base: '1.6rem',
			lg: '2rem',
			xl: '2.4rem',
			'2xl': '2.8rem',
			'3xl': '3.6rem',
			'4xl': '4rem',
			'5xl': '4.4rem',
			'6xl': '4.8rem',
			'7xl': '5.2rem',
			'8xl': '5.6rem',
			'9xl': '6rem'
		},
		lineHeight: {
			DEFAULT: '1.5',
			xs: '1.6rem',
			sm: '1.8rem',
			base: '2rem',
			lg: '2.4rem',
			xl: '2.8rem',
			'2xl': '3.2rem',
			'3xl': '4rem',
			'4xl': '4.4rem',
			'5xl': '4.8rem',
			'6xl': '5.2rem',
			'7xl': '5.6rem',
			'8xl': '6rem',
			'9xl': '6.4rem',
			none: '1',
			tight: '98%',
			snug: '105%'
		},
		letterSpacing: {
			tightest: '-0.12rem',
			tighter: '-0.072rem',
			tight: '-0.048rem',
			normal: '0',
			'normal-wide': '0.014rem',
			wide: '0.016rem',
			wider: '0.063rem',
			widest: '0.072rem'
		},
		colors: {
			transparent: 'transparent',
			white: '#ffffff',
			black: '#000000',
			red: '#C74523',
			'dark-red': '#963F29',
			'dark-grey': '#353535',
			'mid-grey': '#6A6A6A',
			'mid-warm-grey': '#C6C6C6',
			'warm-grey': '#F1F0ED',
			'light-warm-grey': '#FAF9F6',
			'alert-yellow': '#EB1F70',
			'error-red': '#FA6060',
			'success-green': '#70D26E',
			/* Sources */
			'solar-rooftop': '#FFDB35',
			'solar-utlity': '#FECF00',
			wind: '#396A09',
			'battery-discharging': '#0098F9',
			'gas-waste-coal-mine': '#AB5D14',
			'gas-reciprocating': '#F8D7B4',
			'gas-ocgt': '#FFC68B',
			'gas-ccgt': '#FDAB57',
			'gas-steam': '#F2831A',
			distillate: '#F1461D',
			'bioenergy-biomass': '#1B6F6F',
			'bioenergy-biogas': '#43B0B0',
			'coal-black': '#131313',
			'coal-brown': '#804D25',
			/* Loads */
			pumps: '#7DA6CA',
			'battery-discharging': '#A9D5ED',
			exports: '#8C6FA8'
		},

		extend: {}
	},
	plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]
};
