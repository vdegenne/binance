import {KlineIndex} from './kline.js'

interface PairOptions extends Binance.KlinesOptions {
	/**
	 * @default false
	 */
	prefetch: boolean

	/**
	 * Used for rehydration
	 */
	rawCandles?: Readonly<Binance.KlineTuple[]>
}
interface ChangeOptions {
	/**
	 * If true, will use the oldest available candle when not enough candles are present.
	 * @default true
	 */
	allowPartial: boolean

	/**
	 * Number of decimal places to round the resulting percentage.
	 * @default 2
	 */
	decimals: number
}

export class Pair {
	base: string
	quote: string
	#options: PairOptions
	fetchPromise?: Promise<Binance.KlineTuple[]>
	#rawCandles: Readonly<Binance.KlineTuple[]> = []
	#cachedCandles?: Binance.Candle[]

	getRawCandles(): Readonly<Binance.KlineTuple[]> {
		return [...this.#rawCandles] // returns a copy
	}

	constructor(base: string, quote: string, options?: Partial<PairOptions>) {
		this.base = base
		this.quote = quote
		this.#options = {
			interval: '1d',
			limit: 100,
			prefetch: false,
			...(options ?? {}),
		}

		// hydrate immediately if rawCandles is provided
		if (this.#options.rawCandles) {
			this.#rawCandles = this.#options.rawCandles
			this.#options.prefetch = false // disable prefetch if raw data is provided
		} else if (this.#options.prefetch) {
			this.fetch()
		}
	}

	async fetch() {
		const url = `https://api.binance.com/api/v3/klines?symbol=${this.base}${this.quote}&interval=${this.#options.interval}&limit=${this.#options.limit}`

		const res = await fetch(url)
		if (!res.ok) {
			const msg = `[Pair.fetch] Failed for ${this.base}/${this.quote} with status ${res.status} ${res.statusText}`
			console.error(msg)
			console.error(`URL: ` + url)
			throw new Error(msg)
		}

		try {
			this.#rawCandles = await res.json()
			this.#cachedCandles = undefined // invalidate cached objects
			return this.#rawCandles
		} catch (err) {
			console.error(
				`[Pair.fetch] Error parsing response for ${this.base}/${this.quote}`,
				err,
			)
			throw err
		}
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
	// inside your Pair class

	getChange(length: number, options?: Partial<ChangeOptions>): number | null {
		const candles = this.getCandles()

		const _options: ChangeOptions = {
			allowPartial: true,
			decimals: 2,
			...options,
		}

		if (!_options.allowPartial && candles.length < length) return null

		const effectiveLength = _options.allowPartial
			? Math.min(length, candles.length)
			: length

		const first = Number(candles[candles.length - effectiveLength].close)
		const last = Number(candles[candles.length - 1].close)

		const factor = Math.pow(10, _options.decimals)
		const change = Math.round(((last - first) / first) * 100 * factor) / factor

		return change
	}
}
