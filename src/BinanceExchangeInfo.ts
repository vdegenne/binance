export interface FetchOptions {
	/**
	 * @default false
	 */
	prefetch?: boolean
}

export class BinanceExchangeInfo {
	#options: FetchOptions
	protected _data: Binance.ExchangeInfo | undefined

	#fetchPromiseWithResolvers:
		| PromiseWithResolvers<Binance.ExchangeInfo | undefined>
		| undefined

	get fetchComplete() {
		if (!this.#fetchPromiseWithResolvers)
			throw new Error('No fetch started yet')
		return this.#fetchPromiseWithResolvers.promise
	}

	constructor(options: FetchOptions) {
		this.#options = {prefetch: false, ...options}

		if (this.#options.prefetch) {
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

	getAllUsdtPairs() {
		if (this._data === undefined) {
			throw new Error(
				'No data available, please wait for the first fetch to complete',
			)
		}

		return this._data.symbols.filter(
			(symbol) => symbol.quoteAsset === 'USDT' && symbol.status === 'TRADING',
		)
	}
}
