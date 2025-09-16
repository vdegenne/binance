import {BinanceExchangeInfo} from '../BinanceExchangeInfo.js'
import {BatchBase, BatchBaseOptions} from './BatchBase.js'

interface BatchClientOptions {
	/**
	 * @default "/data/"
	 */
	baseDirPath: string
}

export class BatchClient extends BatchBase {
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

	async fetchLocal(batchId: string) {
		const base = `${this.#options.baseDirPath}/${batchId}`

		const infoUrl = `${base}/info.json`
		const exchangeInfoUrl = `${base}/exchangeInfo.json`

		const [infoRes, exchangeRes] = await Promise.all([
			fetch(infoUrl),
			fetch(exchangeInfoUrl),
		])

		if (!infoRes.ok) {
			throw new Error(`Failed to fetch info.json at ${infoUrl}`)
		}
		if (!exchangeRes.ok) {
			throw new Error(`Failed to fetch exchangeInfo.json at ${exchangeInfoUrl}`)
		}

		this.info = (await infoRes.json()) as Binance.BatchInfo
		this._binanceExchangeInfo = new BinanceExchangeInfo({
			prefetch: false,
			cache: await exchangeRes.text(),
		})
	}
}
