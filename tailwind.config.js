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
			mono: ['Chivo Mono', 'monospace']
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
			battery_charging: '#577CFF',
			battery_discharging: '#3245c9',
			bioenergy_biogas: '#4CB9B9',
			bioenergy_biomass: '#1D7A7A',
			coal_black: '#121212',
			coal_brown: '#744A26',
			distillate: '#E15C34',
			gas_ccgt: '#FDB462',
			gas_ocgt: '#FFCD96',
			gas_recip: '#F9DCBC',
			gas_steam: '#F48E1B',
			gas_wcmg: '#B46813',
			hydro: '#5EA0C0',
			pumps: '#88AFD0',
			solar_utility: '#FED500',
			solar_thermal: '#FDB200',
			solar_rooftop: '#FFF58D',
			wind: '#2C7629',
			nuclear: '#C75338',
			imports: '#521986',
			exports: '#927BAD',
			interconnector: '#7F7F7F',

			/* Fuel tech groups */
			bioenergy: '#1D7A7A',
			coal: '#25170C',
			gas: '#E87809',
			solar: '#FED500',
			renewables: '#52A972',
			fossils: '#594929',

			demand: '#6A6A6A'
		},

		extend: {
			backgroundImage: {
				grain: "url('/img/grain.svg')"
			}
		}
	},
	plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')]
};
