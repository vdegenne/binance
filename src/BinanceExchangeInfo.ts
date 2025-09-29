export interface FetchOptions {
	/**
	 * @default false
	 */
	prefetch?: boolean

	/**
	 * Inject data directly
	 */
	cache: string | undefined
}

export class BinanceExchangeInfo {
	#options: FetchOptions
	protected _data: Binance.ExchangeInfo | undefined

	getData(): Readonly<Binance.ExchangeInfo> | undefined {
		return this._data
	}

	#fetchPromiseWithResolvers:
		| PromiseWithResolvers<Binance.ExchangeInfo | undefined>
		| undefined

	get fetchComplete() {
		if (!this.#fetchPromiseWithResolvers)
			throw new Error('No fetch started yet')
		return this.#fetchPromiseWithResolvers.promise
	}

	constructor(options?: Partial<FetchOptions>) {
		this.#options = {prefetch: false, cache: undefined, ...options}

		if (this.#options.cache) {
			this._data = JSON.parse(this.#options.cache) as Binance.ExchangeInfo
		} else if (this.#options.prefetch) {
			this.fetchData()
		}
	}

	async fetchData() {
		this.#fetchPromiseWithResolvers = Promise.withResolvers()
		const res = await fetch('https://api.binance.com/api/v3/exchangeInfo')
		if (!res.ok) throw new Error(`Erreur ${res.status}`)
		this._data = await res.json()
		this.#fetchPromiseWithResolvers.resolve(this._data)
		return this._data
	}

	/**
	 * You can pass "*" for all pairs with any quote.
	 */
	filterPairs(quote: string) {
		if (this._data === undefined) {
			throw new Error(
				'No data available, please wait for the first fetch to complete',
			)
		}

		return this._data.symbols.filter(
			(symbol) =>
				(quote === '*' || symbol.quoteAsset === quote) &&
				symbol.status === 'TRADING',
		)
	}

	getAllUsdtPairs() {
		return this.filterPairs('USDT')
	}
}
