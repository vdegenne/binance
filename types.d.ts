declare global {
	export namespace Binance {
		interface ExchangeInfo {
			timezone: string
			serverTime: number
			rateLimits: RateLimit[]
			exchangeFilters: any[]
			symbols: SymbolInfo[]
		}

		interface RateLimit {
			rateLimitType: 'REQUEST_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS'
			interval: 'SECOND' | 'MINUTE' | 'DAY'
			intervalNum: number
			limit: number
		}

		type SymbolStatus =
			| 'PRE_TRADING'
			| 'TRADING'
			| 'POST_TRADING'
			| 'END_OF_DAY'
			| 'HALT'
			| 'AUCTION_MATCH'
			| 'BREAK'

		type OrderType =
			| 'LIMIT'
			| 'LIMIT_MAKER'
			| 'MARKET'
			| 'STOP_LOSS'
			| 'STOP_LOSS_LIMIT'
			| 'TAKE_PROFIT'
			| 'TAKE_PROFIT_LIMIT'
			| 'LIMIT_MAKER'

		type Permission = 'SPOT' | 'MARGIN'

		interface SymbolInfo {
			symbol: string
			status: SymbolStatus
			baseAsset: string
			baseAssetPrecision: number
			quoteAsset: string
			quotePrecision: number
			quoteAssetPrecision: number
			orderTypes: OrderType[]
			icebergAllowed: boolean
			ocoAllowed: boolean
			isSpotTradingAllowed: boolean
			isMarginTradingAllowed: boolean
			filters: any[]
			permissions: Permission[]
		}

		type Candle = {
			openTime: number
			open: string
			high: string
			low: string
			close: string
			volume: string
			closeTime: number
			quoteAssetVolume: string
			numberOfTrades: number
			takerBuyBaseAssetVolume: string
			takerBuyQuoteAssetVolume: string
		}

		type Interval = '1d' | '1h'

		interface KlinesOptions {
			/**
			 * Interval between each kline.
			 *
			 * @default "1d"
			 */
			interval: Binance.Interval

			/**
			 * Limit the number of klines to fetch.
			 *
			 * @default 100
			 */
			limit: number
		}

		type KlineTuple = [
			number,
			string,
			string,
			string,
			string,
			string,
			number,
			string,
			number,
			string,
			string,
		]

		type BaseQuotePair = [string, string]

		interface BatchInfo {
			/** Date of the batch run */
			timestamp: number
			/** All USDT pairs found at this time */
			pairs: BaseQuotePair[]
			/** New pairs over last batch */
			added: BaseQuotePair[] | undefined
			/** Removed pairs over last batch */
			removed: BaseQuotePair[] | undefined

			/** The interval used for the batch */
			interval: Interval
			/** The limit (how many candles for one pair) were used during the batch? */
			limit: number
		}

		type PairsKlinesMap = {[pair_name: string]: Readonly<KlineTuple[]>}
	}
}

export {}
