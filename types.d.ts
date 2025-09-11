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
	}
}

export {}
