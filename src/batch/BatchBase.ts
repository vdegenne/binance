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
	protected _options: BatchBaseOptions
	pairs: Pair[] = []

	getPairs(): Pair[] {
		return [...this.pairs]
	}

	constructor(options?: Partial<BatchBaseOptions>) {
		this._options = {
			quoteAsset: 'USDT',
			interval: '1d',
			limit: 100,
			previousBatch: undefined,
			...options,
		}
	}

	getBinanceExchangeInfo(): Readonly<BinanceExchangeInfo> | undefined {
		return this._binanceExchangeInfo
	}

	getPairFromBaseQuote(base: string, quote: string) {
		return this.pairs.find((p) => p.base === base && p.quote === quote)
	}

	async fetchRemote() {
		const {promise, resolve} = Promise.withResolvers<void>()
		this.fetchPromise = promise

		const timestamp = Date.now()

		this._binanceExchangeInfo = new BinanceExchangeInfo({prefetch: true})
		// TODO: Should we wait before waiting?
		await this._binanceExchangeInfo.fetchComplete

		const pairs = this._binanceExchangeInfo
			.filterPairs(this._options.quoteAsset)
			.map((p) => [p.baseAsset, p.quoteAsset]) as Binance.BaseQuotePair[]

		let added: Binance.BatchInfo['added'] = undefined
		let removed: Binance.BatchInfo['removed'] = undefined

		if (this._options.previousBatch && this._options.previousBatch.info) {
			const previousPairsSet = new Set(
				this._options.previousBatch.info.pairs.map(([b, q]) => `${b}:${q}`),
			)
			const currentPairsSet = new Set(pairs.map(([b, q]) => `${b}:${q}`))

			added = pairs.filter(([b, q]) => !previousPairsSet.has(`${b}:${q}`))
			removed = this._options.previousBatch.info.pairs.filter(
				([b, q]) => !currentPairsSet.has(`${b}:${q}`),
			)
		}

		this.info = {
			interval: this._options.interval,
			limit: this._options.limit,
			timestamp,
			pairs,
			added,
			removed,
		}

		this.pairs = pairs.map(
			(p) => new Pair(p[0], p[1], {prefetch: false, ...this._options}),
		)
		await this.#fetchPairsWithThrottle(this.pairs)

		resolve()
	}

	async #fetchPairsWithThrottle(pairs: Pair[], batchSize = 20, delayMs = 500) {
		for (let i = 0; i < pairs.length; i += batchSize) {
			const pairsSample = pairs.slice(i, i + batchSize)
			const pairNames = pairsSample.map((p) => p.base)
			console.log(`New fetch batch: fetching ${pairNames.join(', ')}`)

			try {
				await Promise.all(pairsSample.map((p) => p.fetch()))
				console.log('✅ Fetch batch succeeded')
			} catch (err) {
				console.error('❌ Fetch batch failed')
				throw err // stop everything
			}

			if (i + batchSize < pairs.length) {
				console.log(`Waiting ${delayMs}ms before next batch...`)
				await new Promise((res) => setTimeout(res, delayMs))
			}
		}
	}
}
