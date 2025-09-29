import fs from 'node:fs/promises'
import path from 'node:path'
import {BinanceExchangeInfoServer} from '../BinanceExchangeInfoServer.js'
import {BatchBase, BatchBaseOptions} from './BatchBase.js'

export interface BatchServerOptions extends BatchBaseOptions {
	/**
	 * @default ./data
	 */
	baseDirPath: string

	/**
	 * If true, will save each pairs and their klines in dedicated files.
	 * A big file (called `klines.json`) will still be generated at the base dir of the batch.
	 *
	 * @default false
	 */
	separateFiles: boolean
}

export class BatchServer extends BatchBase {
	protected _binanceExchangeInfo: BinanceExchangeInfoServer | undefined
	protected _options!: BatchServerOptions

	constructor(options?: Partial<BatchServerOptions>) {
		super(options)
		this._options = {
			baseDirPath: './data',
			separateFiles: false,
			...(this._options as BatchBaseOptions),
		}
	}

	async readLocal(batchId: string) {
		const dirpath = path.join(this._options.baseDirPath, batchId)
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

		const dirpath = path.join(this._options.baseDirPath, timestamp.toString())

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

		// Step 1: create the map
		const pairsKlinesMap: Binance.PairsKlinesMap = {}
		this.pairs.forEach((pair) => {
			const pair_name = `${pair.base}_${pair.quote}`
			pairsKlinesMap[pair_name] = pair.getRawCandles()
		})

		// Step 2: save each pair separately
		if (this._options.separateFiles) {
			const pairsDir = path.join(dirpath, 'pairs')
			await fs.mkdir(pairsDir, {recursive: true})

			await Promise.all(
				Object.entries(pairsKlinesMap).map(([pairName, candles]) =>
					fs.writeFile(
						path.join(pairsDir, `${pairName}.json`),
						JSON.stringify(candles),
						'utf-8',
					),
				),
			)
		}

		// Step 3: save the full map as one big file
		await fs.writeFile(
			path.join(dirpath, 'klines.json'),
			JSON.stringify(pairsKlinesMap),
			'utf-8',
		)
	}
}
