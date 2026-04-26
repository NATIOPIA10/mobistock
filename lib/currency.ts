
export type StoreSettings = {
  currency: string;
  exchange_rate: number;
  [key: string]: any;
};

export const convertAmount = (amount: number, settings: StoreSettings | null) => {
  if (!settings) return amount;
  const rate = settings.exchange_rate || 1;
  const currency = settings.currency || "ETB";
  
  // If base currency is ETB and current view is USD/EUR, we divide by rate
  // If current view is ETB, we show as is
  if (currency !== "ETB") {
    return amount / rate;
  }
  return amount;
};

export const formatCurrency = (amount: number, settings: StoreSettings | null) => {
  const converted = convertAmount(amount, settings);
  const currency = settings?.currency || "ETB";
  
  return `${currency} ${converted.toLocaleString(undefined, { 
    minimumFractionDigits: currency === "ETB" ? 0 : 2,
    maximumFractionDigits: currency === "ETB" ? 0 : 2
  })}`;
};

export const fetchLiveExchangeRate = async (base: string = "USD", target: string = "ETB") => {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    const data = await res.json();
    if (data && data.rates) {
      return data.rates[target] || null;
    }
    return null;
  } catch (e) {
    console.error("Exchange Rate API Error:", e);
    return null;
  }
};
