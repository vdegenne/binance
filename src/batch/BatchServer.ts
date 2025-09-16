import fs from 'node:fs/promises'
import path from 'node:path'
import {BatchBase, BatchBaseOptions} from './BatchBase.js'
import {BinanceExchangeInfo} from '../BinanceExchangeInfo.js'
import {BinanceExchangeInfoServer} from '../BinanceExchangeInfoServer.js'

interface BatchServerOptions {
	/**
	 * @default ./data
	 */
	baseDirPath: string
}

export class BatchServer extends BatchBase {
	protected _binanceExchangeInfo: BinanceExchangeInfoServer | undefined
	#options: BatchServerOptions

	constructor(options?: Partial<BatchBaseOptions & BatchServerOptions>) {
		super(options)
		this.#options = {
			baseDirPath: './data',
			...options,
		}
	}

	async readLocal(batchId: string) {
		const dirpath = path.join(this.#options.baseDirPath, batchId)
		const infoRaw = await fs.readFile(path.join(dirpath, 'info.json'), 'utf-8')
		this.info = JSON.parse(infoRaw)

		this._binanceExchangeInfo = new BinanceExchangeInfoServer({
			prefetch: false,
			cacheFilePath: path.join(dirpath, 'exchangeInfo.json'),
		})

		// TODO: load pairs from files if needed (I'll do later)
	}

	async save() {
		if (this.info === undefined || this._binanceExchangeInfo === undefined) {
			throw new Error(
				"Can't save empty structure. Call fetchRemote or readLocal beforehand.",
			)
		}
		const timestamp = this.info.timestamp

		const dirpath = path.join(this.#options.baseDirPath, timestamp.toString())

		await fs.mkdir(dirpath, {recursive: true})
		await fs.writeFile(
			path.join(dirpath, 'exchangeInfo.json'),
			JSON.stringify(this._binanceExchangeInfo.getData()),
			'utf-8',
		)

		await fs.writeFile(
			path.join(dirpath, 'info.json'),
			JSON.stringify(this.info),
		)

		const pairsDir = path.join(dirpath, 'pairs')
		await fs.mkdir(pairsDir, {recursive: true})

		await Promise.all(
			this.pairs.map((pair) =>
				fs.writeFile(
					path.join(pairsDir, `${pair.base}_${pair.quote}.json`),
					JSON.stringify(pair.getRawCandles()),
					'utf-8',
				),
			),
		)
	}
}
