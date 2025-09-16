import {KlineIndex} from './kline.js'

interface PairOptions extends Binance.KlinesOptions {
	/**
	 * @default false
	 */
	prefetch: boolean
	/**
	 * Used for hydration
	 */
	rawCandles?: Binance.KlineTuple[]
}

export class Pair {
	base: string
	quote: string
	options: PairOptions
	fetchPromise?: Promise<Binance.KlineTuple[]>
	#rawCandles: Binance.KlineTuple[] = []
	#cachedCandles?: Binance.Candle[]

	getRawCandles(): Readonly<Binance.KlineTuple[]> {
		return [...this.#rawCandles] // returns a copy
	}

	constructor(base: string, quote: string, options?: Partial<PairOptions>) {
		this.base = base
		this.quote = quote
		this.options = {
			interval: '1d',
			limit: 100,
			prefetch: false,
			...(options ?? {}),
		}

		// hydrate immediately if rawCandles is provided
		if (this.options.rawCandles) {
			this.#rawCandles = this.options.rawCandles
			this.options.prefetch = false // disable prefetch if raw data is provided
		} else if (this.options.prefetch) {
			this.fetch()
		}
	}

	async fetch() {
		const url = `https://api.binance.com/api/v3/klines?symbol=${this.base}${this.quote}&interval=${this.options.interval}&limit=${this.options.limit}`
		const res = await fetch(url)
		if (!res.ok) throw new Error(`Failed to fetch candles: ${res.status}`)
		this.#rawCandles = await res.json()
		this.#cachedCandles = undefined // invalidate cached objects
		return this.#rawCandles
	}

	// Lazy object accessor
	getCandles(): Binance.Candle[] {
		if (!this.#cachedCandles) {
			this.#cachedCandles = this.#rawCandles.map((c) => ({
				openTime: c[KlineIndex.OPEN_TIME],
				open: c[KlineIndex.OPEN],
				high: c[KlineIndex.HIGH],
				low: c[KlineIndex.LOW],
				close: c[KlineIndex.CLOSE],
				volume: c[KlineIndex.VOLUME],
				closeTime: c[KlineIndex.CLOSE_TIME],
				quoteAssetVolume: c[KlineIndex.QUOTE_ASSET_VOLUME],
				numberOfTrades: c[KlineIndex.NUMBER_OF_TRADES],
				takerBuyBaseAssetVolume: c[KlineIndex.TAKER_BUY_BASE_ASSET_VOLUME],
				takerBuyQuoteAssetVolume: c[KlineIndex.TAKER_BUY_QUOTE_ASSET_VOLUME],
			}))
		}
		return this.#cachedCandles
	}
	// Example: access single property lazily
	// getOpenTimes(): number[] {
	//     return this._rawCandles.map(c => c[KlineIndex.OPEN_TIME])
	// }
}
