import {BinanceExchangeInfo} from '../BinanceExchangeInfo.js'
import {Pair} from '../Pair.js'

export interface BatchBaseOptions extends Binance.KlinesOptions {
	/**
	 * @default "USDT"
	 */
	quoteAsset: string

	/**
	 * Used for the calculation of added and removed
	 */
	previousBatch: BatchBase | undefined | null
}

export class BatchBase {
	protected _binanceExchangeInfo: BinanceExchangeInfo | undefined

	fetchPromise: Promise<void> | undefined
	info: Binance.BatchInfo | undefined
	#options: BatchBaseOptions
	pairs: Pair[] = []

	constructor(options?: Partial<BatchBaseOptions>) {
		this.#options = {
			quoteAsset: 'USDT',
			interval: '1d',
			limit: 100,
			previousBatch: undefined,
			...options,
		}
	}

	async fetchRemote() {
		const {promise, resolve} = Promise.withResolvers<void>()
		this.fetchPromise = promise

		const timestamp = Date.now()

		this._binanceExchangeInfo = new BinanceExchangeInfo({prefetch: true})
		// TODO: Should we wait before waiting?
		await this._binanceExchangeInfo.fetchComplete

		const pairs = this._binanceExchangeInfo
			.filterPairs(this.#options.quoteAsset)
			.map((p) => [p.baseAsset, p.quoteAsset]) as Binance.BaseQuotePair[]

		let added: Binance.BatchInfo['added'] = undefined
		let removed: Binance.BatchInfo['removed'] = undefined

		if (this.#options.previousBatch && this.#options.previousBatch.info) {
			const previousPairsSet = new Set(
				this.#options.previousBatch.info.pairs.map(([b, q]) => `${b}:${q}`),
			)
			const currentPairsSet = new Set(pairs.map(([b, q]) => `${b}:${q}`))

			added = pairs.filter(([b, q]) => !previousPairsSet.has(`${b}:${q}`))
			removed = this.#options.previousBatch.info.pairs.filter(
				([b, q]) => !currentPairsSet.has(`${b}:${q}`),
			)
		}

		this.info = {
			timestamp,
			pairs,
			added,
			removed,
		}

		this.pairs = pairs.map(
			(p) => new Pair(p[0], p[1], {prefetch: false, ...this.#options}),
		)
		await this.#fetchPairsWithThrottle(this.pairs)

		resolve()
	}

	async #fetchPairsWithThrottle(pairs: Pair[], batchSize = 20, delayMs = 500) {
		for (let i = 0; i < pairs.length; i += batchSize) {
			const batch = pairs.slice(i, i + batchSize)
			await Promise.allSettled(batch.map((p) => p.fetch()))
			if (i + batchSize < pairs.length) {
				await new Promise((res) => setTimeout(res, delayMs))
			}
		}
	}
}
