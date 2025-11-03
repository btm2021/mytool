// Global state
let currentMarket = 'crypto';
let currentPosition = 'long';
let calculationHistory = [];

// Leverage snap points
const leverageSnapPoints = [1, 5, 10, 15, 20, 25, 50];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeMarketSelector();
    initializePositionButtons();
    initializeLeverageSlider();
    initializeForm();
    initializeHistory();
});

// Market Selector
function initializeMarketSelector() {
    const marketButtons = document.querySelectorAll('.market-btn');
    
    marketButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            marketButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentMarket = this.dataset.market;
            
            // Hide all sections
            document.querySelectorAll('.market-section').forEach(section => {
                section.classList.add('hidden');
            });
            
            // Show selected section
            document.getElementById(`${currentMarket}-section`).classList.remove('hidden');
            
            // Hide results
            document.getElementById('results').classList.add('hidden');
        });
    });
}

// Position Buttons
function initializePositionButtons() {
    const positionButtons = document.querySelectorAll('.position-btn');
    
    positionButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const parent = this.parentElement;
            parent.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentPosition = this.dataset.position;
        });
    });
}

// Leverage Slider with Snap
function initializeLeverageSlider() {
    const leverageSlider = document.getElementById('leverage');
    const leverageValue = document.getElementById('leverage-value');
    
    leverageSlider.addEventListener('input', function() {
        let value = parseInt(this.value);
        
        // Find closest snap point
        let closest = leverageSnapPoints.reduce((prev, curr) => {
            return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
        });
        
        // Snap if within threshold
        if (Math.abs(value - closest) <= 2) {
            value = closest;
            this.value = value;
        }
        
        leverageValue.textContent = value;
    });
}

// Form Submission
function initializeForm() {
    document.getElementById('pnl-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate inputs
        if (!validateInputs()) {
            return;
        }
        
        let result;
        
        if (currentMarket === 'crypto') {
            result = calculateCryptoPNL();
        } else if (currentMarket === 'forex') {
            result = calculateForexPNL();
        } else if (currentMarket === 'xau') {
            result = calculateXAUPNL();
        }
        
        displayResults(result);
    });
}

// Validate inputs
function validateInputs() {
    let isValid = true;
    let invalidInputs = [];
    
    if (currentMarket === 'crypto') {
        const entryPrice = document.getElementById('entry-price');
        const exitPrice = document.getElementById('exit-price');
        const investment = document.getElementById('investment');
        
        if (!entryPrice.value || parseFloat(entryPrice.value) <= 0) {
            invalidInputs.push(entryPrice);
            isValid = false;
        }
        if (!exitPrice.value || parseFloat(exitPrice.value) <= 0) {
            invalidInputs.push(exitPrice);
            isValid = false;
        }
        if (!investment.value || parseFloat(investment.value) <= 0) {
            invalidInputs.push(investment);
            isValid = false;
        }
    } else if (currentMarket === 'forex') {
        const entryPrice = document.getElementById('forex-entry');
        const exitPrice = document.getElementById('forex-exit');
        const lots = document.getElementById('forex-lots');
        const pipValue = document.getElementById('forex-pip-value');
        
        if (!entryPrice.value || parseFloat(entryPrice.value) <= 0) {
            invalidInputs.push(entryPrice);
            isValid = false;
        }
        if (!exitPrice.value || parseFloat(exitPrice.value) <= 0) {
            invalidInputs.push(exitPrice);
            isValid = false;
        }
        if (!lots.value || parseFloat(lots.value) <= 0) {
            invalidInputs.push(lots);
            isValid = false;
        }
        if (!pipValue.value || parseFloat(pipValue.value) <= 0) {
            invalidInputs.push(pipValue);
            isValid = false;
        }
    } else if (currentMarket === 'xau') {
        const entryPrice = document.getElementById('xau-entry');
        const exitPrice = document.getElementById('xau-exit');
        const lots = document.getElementById('xau-lots');
        
        if (!entryPrice.value || parseFloat(entryPrice.value) <= 0) {
            invalidInputs.push(entryPrice);
            isValid = false;
        }
        if (!exitPrice.value || parseFloat(exitPrice.value) <= 0) {
            invalidInputs.push(exitPrice);
            isValid = false;
        }
        if (!lots.value || parseFloat(lots.value) <= 0) {
            invalidInputs.push(lots);
            isValid = false;
        }
    }
    
    if (!isValid) {
        // Add error styling and shake animation
        invalidInputs.forEach(input => {
            input.classList.add('error', 'shake');
            
            // Remove shake animation after it completes
            setTimeout(() => {
                input.classList.remove('shake');
            }, 500);
            
            // Remove error styling when user starts typing
            input.addEventListener('input', function removeError() {
                input.classList.remove('error');
                input.removeEventListener('input', removeError);
            });
        });
    }
    
    return isValid;
}

// Crypto PNL Calculation (Binance Formula)
function calculateCryptoPNL() {
    const entryPrice = parseFloat(document.getElementById('entry-price').value);
    const exitPrice = parseFloat(document.getElementById('exit-price').value);
    const investment = parseFloat(document.getElementById('investment').value);
    const leverage = parseInt(document.getElementById('leverage').value);
    
    // Position size = (Investment × Leverage) / Entry Price
    const positionSize = (investment * leverage) / entryPrice;
    
    // PNL calculation based on Binance formula
    let pnl;
    if (currentPosition === 'long') {
        // Long: PNL = Position Size × (Exit Price - Entry Price)
        pnl = positionSize * (exitPrice - entryPrice);
    } else {
        // Short: PNL = Position Size × (Entry Price - Exit Price)
        pnl = positionSize * (entryPrice - exitPrice);
    }
    
    // ROI = (PNL / Investment) × 100
    const roi = (pnl / investment) * 100;
    
    return {
        positionSize: positionSize.toFixed(2) + ' coins',
        entryPrice: entryPrice.toFixed(5) + ' USDT',
        exitPrice: exitPrice.toFixed(5) + ' USDT',
        pnl: pnl.toFixed(1) + ' USDT',
        roi: roi.toFixed(1) + '%',
        pnlRaw: pnl,
        leverage: leverage,
        lots: null
    };
}

// Forex PNL Calculation
function calculateForexPNL() {
    const entryPrice = parseFloat(document.getElementById('forex-entry').value);
    const exitPrice = parseFloat(document.getElementById('forex-exit').value);
    const lots = parseFloat(document.getElementById('forex-lots').value);
    const pipValue = parseFloat(document.getElementById('forex-pip-value').value);
    
    // Calculate pip difference (for 5-decimal pairs like EURUSD)
    let priceDiff = exitPrice - entryPrice;
    if (currentPosition === 'short') {
        priceDiff = entryPrice - exitPrice;
    }
    
    // Convert to pips (1 pip = 0.0001 for most pairs)
    const pips = priceDiff * 10000;
    
    // PNL = Pips × Pip Value × Lots
    const pnl = pips * pipValue * lots;
    
    return {
        positionSize: lots.toFixed(2) + ' lots',
        entryPrice: entryPrice.toFixed(5),
        exitPrice: exitPrice.toFixed(5),
        pnl: pnl.toFixed(2) + ' USD (' + pips.toFixed(1) + ' pips)',
        roi: '-',
        pnlRaw: pnl,
        leverage: null,
        lots: lots
    };
}

// XAU PNL Calculation
function calculateXAUPNL() {
    const entryPrice = parseFloat(document.getElementById('xau-entry').value);
    const exitPrice = parseFloat(document.getElementById('xau-exit').value);
    const lots = parseFloat(document.getElementById('xau-lots').value);
    
    // 1 lot = 100 oz
    const ounces = lots * 100;
    
    // Calculate price difference
    let priceDiff = exitPrice - entryPrice;
    if (currentPosition === 'short') {
        priceDiff = entryPrice - exitPrice;
    }
    
    // PNL = Price Difference × Ounces
    const pnl = priceDiff * ounces;
    
    return {
        positionSize: lots.toFixed(2) + ' lots (' + ounces.toFixed(0) + ' oz)',
        entryPrice: entryPrice.toFixed(2) + ' USD',
        exitPrice: exitPrice.toFixed(2) + ' USD',
        pnl: pnl.toFixed(2) + ' USD',
        roi: '-',
        pnlRaw: pnl,
        leverage: null,
        lots: lots
    };
}

// Display Results
function displayResults(result, addHistory = true) {
    // Calculate additional metrics
    const entryPriceNum = parseFloat(result.entryPrice);
    const exitPriceNum = parseFloat(result.exitPrice);
    const priceChange = exitPriceNum - entryPriceNum;
    const priceChangePercent = (priceChange / entryPriceNum) * 100;
    
    // Store these in result object
    result.priceChange = priceChange.toFixed(2);
    result.priceChangePercent = priceChangePercent.toFixed(2);
    
    document.getElementById('position-size').textContent = result.positionSize;
    document.getElementById('result-entry').textContent = result.entryPrice;
    document.getElementById('result-exit').textContent = result.exitPrice;
    document.getElementById('roi-value').textContent = result.roi;
    document.getElementById('price-change').textContent = result.priceChange;
    document.getElementById('price-change-percent').textContent = result.priceChangePercent + '%';
    
    const pnlElement = document.getElementById('pnl-value');
    pnlElement.textContent = result.pnl;
    
    const priceChangeElement = document.getElementById('price-change');
    const priceChangePercentElement = document.getElementById('price-change-percent');
    
    // Color coding for PNL and price change
    pnlElement.classList.remove('positive', 'negative');
    priceChangeElement.classList.remove('positive', 'negative');
    priceChangePercentElement.classList.remove('positive', 'negative');
    
    if (result.pnlRaw > 0) {
        pnlElement.classList.add('positive');
    } else if (result.pnlRaw < 0) {
        pnlElement.classList.add('negative');
    }
    
    if (priceChange > 0) {
        priceChangeElement.classList.add('positive');
        priceChangePercentElement.classList.add('positive');
    } else if (priceChange < 0) {
        priceChangeElement.classList.add('negative');
        priceChangePercentElement.classList.add('negative');
    }
    
    // Hide empty state and show results
    document.querySelector('.results .empty-state').style.display = 'none';
    document.getElementById('results-content').classList.remove('hidden');
    
    // Add to history only if requested
    if (addHistory) {
        addToHistory(result);
    }
}

// Display results from history with blink effect
function displayResultsFromHistory(item) {
    const resultsContent = document.getElementById('results-content');
    
    // Add blink effect
    resultsContent.classList.add('blink');
    
    // Display results without adding to history
    displayResults(item, false);
    
    // Remove blink effect after animation
    setTimeout(() => {
        resultsContent.classList.remove('blink');
    }, 600);
}

// History Management
function initializeHistory() {
    document.getElementById('clear-history').addEventListener('click', function() {
        calculationHistory = [];
        renderHistory();
    });
}

function addToHistory(result) {
    const historyItem = {
        timestamp: new Date(),
        market: currentMarket,
        position: currentPosition,
        symbol: getSymbol(),
        ...result
    };
    
    calculationHistory.unshift(historyItem);
    
    // Keep only last 50 calculations
    if (calculationHistory.length > 50) {
        calculationHistory = calculationHistory.slice(0, 50);
    }
    
    renderHistory();
}

function getSymbol() {
    if (currentMarket === 'crypto') {
        return document.getElementById('symbol').value;
    } else if (currentMarket === 'forex') {
        return document.getElementById('forex-pair').value;
    } else {
        return document.getElementById('xau-symbol').value;
    }
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    
    if (calculationHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No calculations yet</div>';
        return;
    }
    
    historyList.innerHTML = calculationHistory.map((item, index) => {
        const time = formatTime(item.timestamp);
        const pnlClass = item.pnlRaw > 0 ? 'positive' : item.pnlRaw < 0 ? 'negative' : '';
        
        // Add leverage or lot info
        let additionalInfo = '';
        if (item.leverage) {
            additionalInfo = `<span class="history-leverage">${item.leverage}x</span>`;
        } else if (item.lots) {
            additionalInfo = `<span class="history-leverage">${item.lots} lot</span>`;
        }
        
        return `
            <div class="history-item" onclick="loadHistoryItem(${index})">
                <div class="history-item-header">
                    <div>
                        <span class="history-symbol">${item.symbol}</span>
                        <span class="history-position ${item.position}">${item.position.toUpperCase()}</span>
                        ${additionalInfo}
                    </div>
                    <span class="history-time">${time}</span>
                </div>
                <div class="history-pnl ${pnlClass}">${item.pnl}</div>
            </div>
        `;
    }).join('');
}

function formatTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function loadHistoryItem(index) {
    const item = calculationHistory[index];
    
    // Switch to correct market (without triggering click)
    document.querySelectorAll('.market-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.market === item.market) {
            btn.classList.add('active');
        }
    });
    
    currentMarket = item.market;
    
    // Show correct section
    document.querySelectorAll('.market-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(`${currentMarket}-section`).classList.remove('hidden');
    
    // Set position
    currentPosition = item.position;
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.position === item.position) {
            btn.classList.add('active');
        }
    });
    
    // Display results with blink effect (without adding to history)
    displayResultsFromHistory(item);
}
