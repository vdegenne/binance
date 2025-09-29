import {BatchClient, HydrationOptions} from './BatchClient.js'

interface BatchesManagerClientOptions {
	/**
	 * @default "/data/"
	 */
	baseDirPath: string
}

export class BatchesManagerClient {
	batchIds: string[] = []
	fetchPromise: Promise<void> | undefined
	#options: BatchesManagerClientOptions

	#batches: BatchClient[] = []

	constructor(options?: Partial<BatchesManagerClientOptions>) {
		this.#options = {baseDirPath: '/data/', ...options}
	}

	async init() {
		return (this.fetchPromise = new Promise(async (resolve) => {
			const baseDirPath = this.#options.baseDirPath

			const res = await fetch(`./${baseDirPath}/batches.json`)
			if (res.ok) {
				this.batchIds = await res.json()
			}

			this.#batches = this.batchIds.map((batchId) => {
				const batch = new BatchClient({baseDirPath})
				batch.id = batchId
				return batch
			})

			// hydrate the first batch?
			// await this.hydrateBatch(this.batchIds[0])

			resolve()
		}))
	}

	getBatchFromId(batchId: string) {
		return this.#batches.find((b) => b.id === batchId)
	}
	getBatchFromIndex(index: number): BatchClient | undefined {
		const batch = this.#batches[index]
		return batch
	}

	getHydratedBatchFromId(batchId: string, options?: Partial<HydrationOptions>) {
		const batch = this.getBatchFromId(batchId)
		if (!batch) {
			return undefined
		}
		return batch.rehydrate(options)
	}
	getHydratedBatchFromIndex(
		index: number,
		options?: Partial<HydrationOptions>,
	) {
		const batch = this.getBatchFromIndex(index)
		if (!batch) {
			return undefined
		}
		return batch.rehydrate(options)
	}
}
