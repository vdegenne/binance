import fs from 'node:fs/promises'
import path from 'node:path'
import {BinanceExchangeInfo, FetchOptions} from './BinanceExchangeInfo.js'

interface ServerOptions extends FetchOptions {
	/**
	 * @default './data/exchange-info.json'
	 */
	cacheFilePath?: string
}

export class BinanceExchangeInfoServer extends BinanceExchangeInfo {
	#options: Required<ServerOptions>
	#fetchPromiseWithResolvers: PromiseWithResolvers<
		Binance.ExchangeInfo | undefined
	>

	get fetchComplete() {
		return this.#fetchPromiseWithResolvers.promise
	}

	constructor(options: ServerOptions) {
		super({...options, prefetch: false}) // Do not prefetch directly

		// Set defaults for options
		this.#options = {
			cacheFilePath: './data/exchange-info.json',
			prefetch: false,
			...options,
		}

		this.#fetchPromiseWithResolvers = Promise.withResolvers()
		this.#init()
	}

	async #init() {
		this.#fetchPromiseWithResolvers = Promise.withResolvers()

		try {
			await this.#loadCache()
			this.#fetchPromiseWithResolvers.resolve(this._data)
		} catch (err: any) {
			// Only log unexpected errors, not missing cache
			if (err.code && err.code !== 'ENOENT') {
				console.warn('Cache failed to load:', err)
			}
			// If prefetch is disabled, resolve undefined
			if (!this.#options.prefetch) {
				this.#fetchPromiseWithResolvers.resolve(undefined)
				return
			}

			// Cache missing or unreadable, fetch remote
			try {
				const data = await this.fetchData()
				this.#fetchPromiseWithResolvers.resolve(data)
			} catch (fetchErr) {
				this.#fetchPromiseWithResolvers.reject(fetchErr)
			}
		}
	}

	async #loadCache() {
		try {
			const raw = await fs.readFile(this.#options.cacheFilePath, 'utf-8')
			this._data = JSON.parse(raw)
			console.log('Loaded exchange info from cache.')
		} catch (err) {
			console.warn('Could not load cache file')
			throw err
		}
	}

	async fetchData() {
		const data = await super.fetchData()

		try {
			const dir = path.dirname(this.#options.cacheFilePath)
			await fs.mkdir(dir, {recursive: true})
			await fs.writeFile(
				this.#options.cacheFilePath,
				JSON.stringify(data),
				'utf-8',
			)
		} catch (err) {
			console.error('Failed to write cache file:', err)
		}

		return data
	}
}
