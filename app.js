function demoCalculate(){
  const result = document.getElementById('result');
  const value = Math.round((Math.random()*5000+500) * 100) / 100;
  result.textContent = 'Demo estimate: $' + value.toLocaleString();
}
document.getElementById('year').textContent = new Date().getFullYear();

// If your calculator uses additional JS files, include them with <script src="..."></script> in index.html
// and add file names to the ASSETS list inside service-worker.js for offline caching.
