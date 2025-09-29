import {BinanceExchangeInfo} from '../BinanceExchangeInfo.js'
import {Pair} from '../Pair.js'
import {BatchBase, BatchBaseOptions} from './BatchBase.js'

interface BatchClientOptions extends BatchBaseOptions {
	/**
	 * @default "/data/"
	 */
	baseDirPath: string
}

export interface HydrationOptions {
	/**
	 * @default false
	 */
	includeExchangeInfo: boolean

	/**
	 * @default false
	 */
	includePairs: boolean

	/**
	 * @default false
	 */
	force: boolean
}

export class BatchClient extends BatchBase {
	id: string | undefined
	protected _options!: BatchClientOptions

	constructor(options?: Partial<BatchClientOptions>) {
		super(options)
		this._options = {
			baseDirPath: '/data/',
			...(this._options as BatchBaseOptions),
		}
	}

	fetchRemote(areYouSure = false): Promise<void> {
		if (!areYouSure) {
			throw new Error(
				"Pass 'true' to the method to force a new remote fetch if you know what you are doing.",
			)
		}
		return super.fetchRemote()
	}

	#infoHydrated = false
	#exchangeHydrated = false
	#pairsHydrated = false

	async #rehydrateInfo(force = false): Promise<void> {
		if (this.#infoHydrated && !force) return
		if (!this.id)
			throw new Error('Batch.id must be set before rehydrating info.')

		const url = `${this._options.baseDirPath}/${this.id}/info.json`
		const res = await fetch(url)
		if (!res.ok) throw new Error(`Failed to fetch ${url}`)

		this.info = (await res.json()) as Binance.BatchInfo
		this.id = this.info.timestamp.toString()
		this.#infoHydrated = true
	}

	async #rehydrateExchangeInfo(force = false): Promise<void> {
		if (this.#exchangeHydrated && !force) return
		if (!this.id)
			throw new Error('Batch.id must be set before rehydrating exchangeInfo.')

		const url = `${this._options.baseDirPath}/${this.id}/exchangeInfo.json`
		const res = await fetch(url)
		if (!res.ok) throw new Error(`Failed to fetch ${url}`)

		const text = await res.text()
		this._binanceExchangeInfo = new BinanceExchangeInfo({
			prefetch: false,
			cache: text,
		})
		this.#exchangeHydrated = true
	}

	async #rehydratePairs(force = false): Promise<void> {
		if (this.#pairsHydrated && !force) return
		if (!this.id)
			throw new Error('Batch.id must be set before rehydrating pairs.')

		const url = `${this._options.baseDirPath}/${this.id}/klines.json`
		const res = await fetch(url)
		if (!res.ok) throw new Error(`Failed to fetch ${url}`)

		const pairs = (await res.json()) as Binance.PairsKlinesMap
		this.pairs = Object.entries(pairs).map(([pair_name, klines]) => {
			const [base, quote] = pair_name.split('_')
			return new Pair(base, quote, {
				prefetch: false,
				rawCandles: klines,
				...this._options,
			})
		})
		this.#pairsHydrated = true
	}

	#rehydrationPromise: Promise<BatchClient> | null = null
	get rehydrationComplete() {
		return this.#rehydrationPromise
	}

	rehydrate(options?: Partial<HydrationOptions>): Promise<BatchClient> {
		const _options: HydrationOptions = {
			includeExchangeInfo: false,
			includePairs: false,
			force: false,
			...options,
		}

		if (this.#rehydrationPromise && !_options.force)
			return this.#rehydrationPromise

		const {promise, resolve, reject} = Promise.withResolvers<BatchClient>()
		this.#rehydrationPromise = promise

		try {
			const tasks: Promise<void>[] = [this.#rehydrateInfo(_options.force)]
			if (_options.includeExchangeInfo)
				tasks.push(this.#rehydrateExchangeInfo(_options.force))
			if (_options.includePairs)
				tasks.push(this.#rehydratePairs(_options.force))

			Promise.all(tasks)
				.then(() => resolve(this))
				.catch(reject)
		} catch (err) {
			reject(err)
		}

		return this.#rehydrationPromise
	}
}
