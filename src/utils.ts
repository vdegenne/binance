export function binanceUrl(base: string, quote: string) {
	return `https://www.binance.com/en/trade/${base}_${quote}`
}

export function binanceOpen(base: string, quote: string) {
	window.open(binanceUrl(base, quote), '_blank')
}
