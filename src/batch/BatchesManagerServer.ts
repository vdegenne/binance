import fs from 'node:fs/promises'
import path from 'node:path'
import {BatchServer} from './BatchServer.js'

const t = setTimeout(() => {})

interface BatchesManagerServerOptions extends Binance.KlinesOptions {
	/**
	 * @default ./data
	 */
	baseDirPath: string
	/**
	 * How many batches to keep
	 *
	 * @default 10
	 */
	keepLast: number
}

export class BatchesManagerServer {
	#options: BatchesManagerServerOptions

	constructor(options?: Partial<BatchesManagerServerOptions>) {
		this.#options = {
			baseDirPath: './data',
			interval: '1d',
			keepLast: 10,
			limit: 100,
			...options,
		}
	}

	async createNewBatch() {
		const previousBatch = await this.getLastBatch()
		const batch = new BatchServer({...this.#options, previousBatch})

		await batch.fetchRemote()
		await batch.save()

		await this.#cleanupOldBatches()
	}

	async listBatches() {
		try {
			const entries = await fs.readdir(this.#options.baseDirPath, {
				withFileTypes: true,
			})
			const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
			return dirs.sort((a, b) => Number(b) - Number(a)) // sorted by timestamp (newest first)
		} catch {
			return []
		}
	}

	async #cleanupOldBatches() {
		const dirs = await this.listBatches()
		const excess = dirs.length - this.#options.keepLast
		if (excess > 0) {
			// Remove the oldest batches, which are at the **end** now
			await Promise.all(
				dirs.slice(-excess).map((dir) =>
					fs.rm(path.join(this.#options.baseDirPath, dir), {
						recursive: true,
						force: true,
					}),
				),
			)
		}
		await fs.writeFile(
			path.join(this.#options.baseDirPath, 'batches.json'),
			JSON.stringify(dirs.slice(0, this.#options.keepLast), null, 2),
		)
	}

	async loadBatch(batchId: string): Promise<BatchServer | null> {
		const batch = new BatchServer(this.#options)
		try {
			await batch.readLocal(batchId)
			return batch
		} catch {
			return null
		}
	}

	async getLastBatch(): Promise<BatchServer | null> {
		const dirs = await this.listBatches()
		if (dirs.length === 0) return null

		const lastId = dirs[0] // newest first
		return this.loadBatch(lastId)
	}
}
