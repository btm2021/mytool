function formatVolume(volume) {
    if (volume >= 1e9) {
        return (volume / 1e9).toFixed(2) + 'B';
    } else if (volume >= 1e6) {
        return (volume / 1e6).toFixed(2) + 'M';
    } else if (volume >= 1e3) {
        return (volume / 1e3).toFixed(2) + 'K';
    }
    return volume.toFixed(2);
}

export async function fetchBinanceSymbols() {
    const infoResponse = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
    const infoData = await infoResponse.json();
    const validSymbols = infoData.symbols
        .filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT')
        .map(s => s.symbol);

    const tickerResponse = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr');
    const tickerData = await tickerResponse.json();

    const volumeMap = new Map();
    tickerData.forEach(ticker => {
        if (validSymbols.includes(ticker.symbol)) {
            volumeMap.set(ticker.symbol, parseFloat(ticker.quoteVolume) || 0);
        }
    });

    return Array.from(volumeMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([symbol, volume]) => ({
            symbol,
            volume: volume.toFixed(0),
            volumeFormatted: formatVolume(volume)
        }));
}

export async function fetchBybitSymbols() {
    const tickerResponse = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
    const data = await tickerResponse.json();

    if (data.retCode !== 0) {
        throw new Error(data.retMsg || 'Bybit API error');
    }

    return data.result.list
        .filter(t => t.symbol.endsWith('USDT'))
        .map(t => ({
            symbol: t.symbol,
            volume: parseFloat(t.turnover24h) || 0,
            volumeFormatted: formatVolume(parseFloat(t.turnover24h) || 0)
        }))
        .sort((a, b) => b.volume - a.volume)
        .map(item => ({
            symbol: item.symbol,
            volume: item.volume.toFixed(0),
            volumeFormatted: item.volumeFormatted
        }));
}

export async function fetchOKXSymbols() {
    const tickerResponse = await fetch('https://www.okx.com/api/v5/market/tickers?instType=SWAP');
    const data = await tickerResponse.json();

    if (data.code !== '0') {
        throw new Error(data.msg || 'OKX API error');
    }

    return data.data
        .filter(t => t.instId.endsWith('-USDT-SWAP'))
        .map(t => {
            const normalizedSymbol = t.instId.replace('-USDT-SWAP', 'USDT');
            return {
                symbol: normalizedSymbol,
                volume: parseFloat(t.volCcy24h) || 0,
                volumeFormatted: formatVolume(parseFloat(t.volCcy24h) || 0)
            };
        })
        .sort((a, b) => b.volume - a.volume)
        .map(item => ({
            symbol: item.symbol,
            volume: item.volume.toFixed(0),
            volumeFormatted: item.volumeFormatted
        }));
}
