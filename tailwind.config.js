/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	safelist: [
		{
			pattern: /bg-*-*/
		}
	],
	theme: {
		fontFamily: {
			sans: ['DM Sans', 'sans-serif'],
			space: ['Space Grotesk', 'sans-serif'],
			mono: ['monospace']
		},
		screens: {
			sm: '640px',
			md: '1024px',
			lg: '1440px',
			xl: '1920px'
		},
		container: {
			center: true,
			padding: {
				DEFAULT: '2.5rem',
				md: '4rem',
				lg: '10rem',
				xl: '24rem'
			}
		},
		fontSize: {
			DEFAULT: '1.6rem',
			xxxs: '0.8rem',
			xxs: '1rem',
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
			widest: '0.15rem'
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

			/* Fuel techs */
			battery_charging: '#A9D5ED',
			battery_discharging: '#0098F9',
			bioenergy_biogas: '#43B0B0',
			bioenergy_biomass: '#1B6F6F',
			coal_black: '#131313',
			coal_brown: '#804D25',
			distillate: '#F1461D',
			gas_ccgt: '#FDAB57',
			gas_ocgt: '#FFC68B',
			gas_recip: '#F8D7B4',
			gas_steam: '#F2831A',
			gas_wcmg: '#AB5D14',
			hydro: '#3C77AB',
			pumps: '#7DA6CA',
			solar_utility: '#FECF00',
			solar_thermal: '',
			solar_rooftop: '#FFDB35',
			wind: '#396A09',
			nuclear: '#FF0000',
			imports: '#00FF00',
			exports: '#8C6FA8',
			interconnector: '#0000FF',

			/* Fuel tech groups */
			bioenergy: '#43B0B0',
			coal: '#131313',
			gas: '#FDAB57',
			solar: '#FFDB35'
		},

		extend: {
			backgroundImage: {
				grain: "url('/img/grain.svg')"
			}
		}
	},
	plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]
};
