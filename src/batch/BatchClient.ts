import {BinanceExchangeInfo} from '../BinanceExchangeInfo.js'
import {BatchBase, BatchBaseOptions} from './BatchBase.js'

interface BatchClientOptions {
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
}

export class BatchClient extends BatchBase {
	id: string | undefined
	#options: BatchClientOptions

	constructor(options?: Partial<BatchBaseOptions & BatchClientOptions>) {
		super(options)
		this.#options = {
			baseDirPath: '/data/',
			...options,
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

	rehydrationComplete: Promise<BatchClient> | undefined

	async rehydrate(options?: Partial<HydrationOptions>) {
		const {promise, resolve} = Promise.withResolvers<BatchClient>()
		this.rehydrationComplete = promise

		if (this.id === undefined) {
			throw new Error(
				'You need to provide set batch.id before fetching locally.',
			)
		}

		const _options: HydrationOptions = {
			includeExchangeInfo: false,
			includePairs: false,
			...options,
		}

		const base = `${this.#options.baseDirPath}/${this.id}`
		const urls: (string | undefined)[] = [
			`${base}/info.json`,
			_options.includeExchangeInfo ? `${base}/exchangeInfo.json` : undefined,
			_options.includePairs ? `${base}/pairs.json` : undefined, // placeholder
		]

		// Build array of fetch promises, skipping undefined
		const fetchPromises = urls.map((url) =>
			url
				? fetch(url).then((res) => {
						if (!res.ok) throw new Error(`Failed to fetch ${url}`)
						// Use json for info/pairs, text for exchangeInfo
						return url.includes('exchangeInfo.json') ? res.text() : res.json()
					})
				: undefined,
		)

		// Wait for all to resolve
		const [info, exchangeText, pairs] = await Promise.all(fetchPromises)

		// Concurrently handle results
		this.info = info as Binance.BatchInfo
		this.id = this.info.timestamp.toString()

		if (exchangeText !== undefined) {
			this._binanceExchangeInfo = new BinanceExchangeInfo({
				prefetch: false,
				cache: exchangeText,
			})
		}

		if (pairs !== undefined) {
			// process pairs here if needed
		}

		resolve(this)
	}
}
