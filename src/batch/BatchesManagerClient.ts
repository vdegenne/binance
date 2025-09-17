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

	batches: BatchClient[] = []

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

			this.batches = this.batchIds.map((batchId) => {
				const batch = new BatchClient({baseDirPath})
				batch.id = batchId
				return batch
			})

			// hydrate the first batch?
			// await this.hydrateBatch(this.batchIds[0])

			resolve()
		}))
	}

	rehydrationComplete: Promise<BatchClient> | undefined

	hydrateBatch(batchId: string, options?: Partial<HydrationOptions>) {
		const batch = this.batches.find((b) => b.id === batchId)
		if (!batch) {
			throw new Error(
				"This batch doesn't exist, have you waited the fetch to finish?",
			)
		}

		batch.rehydrate(options)

		return (this.rehydrationComplete = batch.rehydrationComplete)
	}
}
