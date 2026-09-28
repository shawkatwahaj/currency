
class CurrencyConverter {
    constructor() {
        // API Configuration
        this.apiBaseUrl = 'https://api.exchangerate-api.com/v4/latest';
        this.fallbackApiUrl = 'https://api.fxratesapi.com/latest';
        
        // Available currencies with their flags and names
        this.currencies = {
            'USD': { name: 'دلار آمریکا', flag: '🇺🇸' },
            'EUR': { name: 'یورو', flag: '🇪🇺' },
            'GBP': { name: 'پوند بریتانیا', flag: '🇬🇧' },
            'JPY': { name: 'ین ژاپن', flag: '🇯🇵' },
             'AFN': { name: 'افغانی', flag: '🇦🇫' },
            'PKR': { name: 'روپیه پاکستان', flag: '🇵🇰' },
            'IRR': { name: 'ریال ایران', flag: '🇮🇷' },
            'TRY': { name: 'لیر ترکیه', flag: '🇹🇷' },
            'RUB': { name: 'روبل روسیه', flag: '🇷🇺' },
            'BRL': { name: 'رئال برزیل', flag: '🇧🇷' },
            'MXN': { name: 'پزو مکزیک', flag: '🇲🇽' },

        };
        
        // Application state
        this.exchangeRates = {};
        this.lastUpdated = null;
        this.isLoading = false;
        
        // DOM elements
        this.elements = {};
        
        // Initialize the application
        this.init();
    }
    
    // Initialize the application
    init() {
        this.cacheElements();
        this.populateCurrencySelects();
        this.loadSavedPreferences();
        this.bindEvents();
        this.loadExchangeRates();
        this.initTheme();
    }
    
    // Cache DOM elements
    cacheElements() {
        this.elements = {
            amountInput: document.getElementById('amount'),
            fromCurrency: document.getElementById('fromCurrency'),
            toCurrency: document.getElementById('toCurrency'),
            convertBtn: document.getElementById('convertBtn'),
            swapBtn: document.getElementById('swapBtn'),
            loadingState: document.getElementById('loadingState'),
            resultSection: document.getElementById('resultSection'),
            resultAmount: document.getElementById('resultAmount'),
            exchangeRate: document.getElementById('exchangeRate'),
            lastUpdated: document.getElementById('lastUpdated'),
            errorMessage: document.getElementById('errorMessage'),
            errorText: document.getElementById('errorText'),
            fromFlag: document.getElementById('fromFlag'),
            toFlag: document.getElementById('toFlag'),
            fromCurrencyLabel: document.getElementById('fromCurrencyLabel'),
            themeToggle: document.getElementById('themeToggle'),
            themeIcon: document.getElementById('themeIcon')
        };
    }
    
    // Populate currency select dropdowns
    populateCurrencySelects() {
        const fromFragment = document.createDocumentFragment();
        const toFragment = document.createDocumentFragment();
        
        Object.entries(this.currencies).forEach(([code, data]) => {
            // From currency option
            const fromOption = document.createElement('option');
            fromOption.value = code;
            fromOption.textContent = `${data.flag} ${code} - ${data.name}`;
            fromFragment.appendChild(fromOption);
            
            // To currency option
            const toOption = document.createElement('option');
            toOption.value = code;
            toOption.textContent = `${data.flag} ${code} - ${data.name}`;
            toFragment.appendChild(toOption);
        });
        
        this.elements.fromCurrency.appendChild(fromFragment);
        this.elements.toCurrency.appendChild(toFragment);
        
        // Set default currencies
        this.elements.fromCurrency.value = 'USD';
        this.elements.toCurrency.value = 'AFN';
        
        // Update flags
        this.updateFlags();
    }
    
    // Bind event listeners
    bindEvents() {
        // Convert button
        this.elements.convertBtn.addEventListener('click', () => this.convertCurrency());
        
        // Swap button
        this.elements.swapBtn.addEventListener('click', () => this.swapCurrencies());
        
        // Enter key on amount input
        this.elements.amountInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.convertCurrency();
            }
        });
        
        // Currency change events
        this.elements.fromCurrency.addEventListener('change', () => {
            this.updateFlags();
            this.savePreferences();
            if (this.elements.amountInput.value) {
                this.convertCurrency();
            }
        });
        
        this.elements.toCurrency.addEventListener('change', () => {
            this.updateFlags();
            this.savePreferences();
            if (this.elements.amountInput.value) {
                this.convertCurrency();
            }
        });
        
        // Amount input change
        this.elements.amountInput.addEventListener('input', () => {
            this.savePreferences();
        });
        
        // Theme toggle
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    }
    
    // Load exchange rates from API
    async loadExchangeRates() {
        if (this.isLoading) return;
        
        this.setLoading(true);
        this.hideError();
        
        try {
            // Try primary API first
            const response = await fetch(`${this.apiBaseUrl}/USD`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.rates) {
                this.exchangeRates = data.rates;
                this.lastUpdated = new Date();
                this.hideLoading();
                
                // Auto-convert if amount is entered
                if (this.elements.amountInput.value) {
                    this.convertCurrency();
                }
            } else {
                throw new Error('Invalid API response format');
            }
            
        } catch (error) {
            console.error('Primary API failed:', error);
            
            // Try fallback API
            try {
                const fallbackResponse = await fetch(`${this.fallbackApiUrl}?base=USD`);
                
                if (!fallbackResponse.ok) {
                    throw new Error(`Fallback API failed: ${fallbackResponse.status}`);
                }
                
                const fallbackData = await fallbackResponse.json();
                
                if (fallbackData.rates) {
                    this.exchangeRates = fallbackData.rates;
                    this.lastUpdated = new Date();
                    this.hideLoading();
                    
                    if (this.elements.amountInput.value) {
                        this.convertCurrency();
                    }
                } else {
                    throw new Error('Invalid fallback API response');
                }
                
            } catch (fallbackError) {
                console.error('Fallback API failed:', fallbackError);
                this.showError('دریافت نرخ ارز با خطا مواجه شد. لطفاً اتصال اینترنت خود را بررسی کنید.');
                this.hideLoading();
            }
        }
    }
    
    // Convert currency
    convertCurrency() {
        const amount = parseFloat(this.elements.amountInput.value);
        
        if (isNaN(amount) || amount <= 0) {
            this.showError('لطفاً یک مبلغ معتبر وارد کنید.');
            return;
        }
        
        if (Object.keys(this.exchangeRates).length === 0) {
            this.loadExchangeRates();
            return;
        }
        
        const fromCurrency = this.elements.fromCurrency.value;
        const toCurrency = this.elements.toCurrency.value;
        
        // Get exchange rates
        const fromRate = this.exchangeRates[fromCurrency];
        const toRate = this.exchangeRates[toCurrency];
        
        if (!fromRate || !toRate) {
            this.showError('نرخ ارز برای این ارزها در دسترس نیست.');
            return;
        }
        
        // Convert: amount in USD * (toRate / fromRate)
        const usdAmount = amount / fromRate;
        const convertedAmount = usdAmount * toRate;
        
        // Display result
        this.displayResult(convertedAmount, fromCurrency, toCurrency, fromRate, toRate);
    }
    
    // Display conversion result
    displayResult(amount, fromCurrency, toCurrency, fromRate, toRate) {
        // Format amount with proper decimal places
        const formattedAmount = this.formatCurrency(amount, toCurrency);
        
        // Calculate exchange rate for display
        const exchangeRate = (toRate / fromRate).toFixed(6);
        
        // Update UI
        this.elements.resultAmount.textContent = formattedAmount;
        this.elements.exchangeRate.textContent = `1 ${fromCurrency} = ${exchangeRate} ${toCurrency}`;
        this.elements.lastUpdated.textContent = `آخرین به‌روزرسانی: ${this.formatTime(this.lastUpdated)}`;
        
        // Show result section
        this.elements.resultSection.classList.add('active');
    }
    
    // Format currency amount
    formatCurrency(amount, currencyCode) {
        // Define decimal places based on currency
        const decimalPlaces = ['JPY', 'KRW', 'CLP'].includes(currencyCode) ? 0 : 2;
        
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        });
    }
    
    // Format time
    formatTime(date) {
        if (!date) return 'نامشخص';
        
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'هم اکنون';
        } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            return `${minutes} دقیقه پیش`;
        } else if (diff < 86400000) { // Less than 1 day
            const hours = Math.floor(diff / 3600000);
            return `${hours} ساعت پیش`;
        } else {
            return date.toLocaleString('fa-IR');
        }
    }
    
    // Swap currencies
    swapCurrencies() {
        const fromValue = this.elements.fromCurrency.value;
        const toValue = this.elements.toCurrency.value;
        
        this.elements.fromCurrency.value = toValue;
        this.elements.toCurrency.value = fromValue;
        
        this.updateFlags();
        this.savePreferences();
        
        // Auto-convert if amount is entered
        if (this.elements.amountInput.value) {
            this.convertCurrency();
        }
    }
    
    // Update currency flags
    updateFlags() {
        const fromCurrency = this.elements.fromCurrency.value;
        const toCurrency = this.elements.toCurrency.value;
        
        this.elements.fromFlag.textContent = this.currencies[fromCurrency].flag;
        this.elements.toFlag.textContent = this.currencies[toCurrency].flag;
        this.elements.fromCurrencyLabel.textContent = fromCurrency;
    }
    
    // Set loading state
    setLoading(isLoading) {
        this.isLoading = isLoading;
        
        if (isLoading) {
            this.elements.loadingState.classList.add('active');
            this.elements.convertBtn.disabled = true;
            this.elements.resultSection.classList.remove('active');
        } else {
            this.elements.loadingState.classList.remove('active');
            this.elements.convertBtn.disabled = false;
        }
    }
    
    // Hide loading state
    hideLoading() {
        this.setLoading(false);
    }
    
    // Show error message
    showError(message) {
        this.elements.errorText.textContent = message;
        this.elements.errorMessage.classList.add('active');
        this.elements.resultSection.classList.remove('active');
    }
    
    // Hide error message
    hideError() {
        this.elements.errorMessage.classList.remove('active');
    }
    
    // Save user preferences to localStorage
    savePreferences() {
        const preferences = {
            fromCurrency: this.elements.fromCurrency.value,
            toCurrency: this.elements.toCurrency.value,
            amount: this.elements.amountInput.value,
            theme: document.documentElement.getAttribute('data-theme')
        };
        
        localStorage.setItem('currencyConverterPrefs', JSON.stringify(preferences));
    }
    
    // Load saved preferences from localStorage
    loadSavedPreferences() {
        try {
            const saved = localStorage.getItem('currencyConverterPrefs');
            if (saved) {
                const preferences = JSON.parse(saved);
                
                if (preferences.fromCurrency) {
                    this.elements.fromCurrency.value = preferences.fromCurrency;
                }
                
                if (preferences.toCurrency) {
                    this.elements.toCurrency.value = preferences.toCurrency;
                }
                
                if (preferences.amount) {
                    this.elements.amountInput.value = preferences.amount;
                }
                
                if (preferences.theme) {
                    document.documentElement.setAttribute('data-theme', preferences.theme);
                    this.updateThemeIcon(preferences.theme);
                }
                
                this.updateFlags();
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        }
    }
    
    // Initialize theme
    initTheme() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('currencyConverterPrefs');
        if (savedTheme) {
            const preferences = JSON.parse(savedTheme);
            if (preferences.theme) {
                document.documentElement.setAttribute('data-theme', preferences.theme);
                this.updateThemeIcon(preferences.theme);
                return;
            }
        }
        
        // Check for system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
            this.updateThemeIcon('dark');}}
    // Toggle theme
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        this.updateThemeIcon(newTheme);
        this.savePreferences();
    }
    
    // Update theme icon
    updateThemeIcon(theme) {
        if (theme === 'dark') {
            this.elements.themeIcon.className = 'fas fa-sun';
        } else {
            this.elements.themeIcon.className = 'fas fa-moon';
        }}}
// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CurrencyConverter();
});

// Handle online/offline status
window.addEventListener('online', () => {
    console.log('Connection restored');
    // Reload exchange rates when coming back online
    const converter = new CurrencyConverter();
    converter.loadExchangeRates();
});

window.addEventListener('offline', () => {
    console.log('Connection lost');
    // Show offline message
    const errorElement = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorElement && errorText) {
        errorText.textContent = 'اتصال اینترنت قطع شد. لطفاً اتصال خود را بررسی کنید.';
        errorElement.classList.add('active');
    }
});

// Add service worker for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
