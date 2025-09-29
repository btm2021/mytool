document.getElementById('pnl-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Get input values
    const symbol = document.getElementById('symbol').value;
    const currentPrice = parseFloat(document.getElementById('current-price').value);
    const investmentAmount = parseFloat(document.getElementById('investment-amount').value);
    const leverage = parseFloat(document.getElementById('leverage').value);
    const side = document.querySelector('input[name="side"]:checked').value;
    const closingPrice = parseFloat(document.getElementById('closing-price').value);

    // Calculate quantity (coins)
    const quantity = (investmentAmount * leverage) / currentPrice;

    // Calculate PNL
    let pnl;
    if (side === 'long') {
        pnl = (closingPrice - currentPrice) * quantity;
    } else {
        pnl = (currentPrice - closingPrice) * quantity;
    }

    // Display results
    document.getElementById('quantity').textContent = quantity.toFixed(6);
    document.getElementById('pnl').textContent = pnl.toFixed(2) + ' USDT';
    document.getElementById('results').classList.remove('hidden');
});
