export interface StructuredIntent {
  merchant?: string;
  category?: string;
  product?: string;
  maxAmount?: number; // in paise
  currency: string;
  validityMinutes: number;
  confidence: number;
  parserVersion: string;
}

export class IntentService {
  /**
   * Deterministically parses unstructured natural language prompt into structured intent bounds.
   */
  static parseRuleBased(rawPrompt: string): StructuredIntent {
    const text = rawPrompt.trim();
    let merchant: string | undefined;
    let category: string | undefined;
    let product: string | undefined;
    let maxAmount: number | undefined;
    const currency = 'INR';
    let validityMinutes = 60;

    // 1. Extract Merchant
    const merchantPatterns: { name: string; regex: RegExp; defaultCategory?: string }[] = [
      { name: 'Amazon', regex: /\b(amazon|amzn)\b/i, defaultCategory: 'Electronics' },
      { name: 'MakeMyTrip', regex: /\b(makemytrip|mmt)\b/i, defaultCategory: 'Travel' },
      { name: 'Uber', regex: /\b(uber|ola)\b/i, defaultCategory: 'Travel' },
      { name: 'Swiggy', regex: /\b(swiggy|zomato)\b/i, defaultCategory: 'Food' },
      { name: 'AWS', regex: /\b(aws|amazon web services)\b/i, defaultCategory: 'Cloud Services' },
      { name: 'Flipkart', regex: /\b(flipkart)\b/i, defaultCategory: 'Electronics' },
      { name: 'Apple', regex: /\b(apple|apple store)\b/i, defaultCategory: 'Electronics' },
    ];

    for (const m of merchantPatterns) {
      if (m.regex.test(text)) {
        merchant = m.name;
        if (m.defaultCategory) category = m.defaultCategory;
        break;
      }
    }

    // 2. Extract Category
    const categoryPatterns: { name: string; regex: RegExp }[] = [
      { name: 'Electronics', regex: /\b(electronics?|gadget|hardware|peripheral|computer|laptop|keyboard|mouse|headphone|monitor)\b/i },
      { name: 'Travel', regex: /\b(travel|flight|hotel|ticket|cab|ride)\b/i },
      { name: 'Food', regex: /\b(food|meal|groceries|dinner|lunch)\b/i },
      { name: 'Cloud Services', regex: /\b(cloud|server|compute|database|hosting|api)\b/i },
    ];

    for (const c of categoryPatterns) {
      if (c.regex.test(text)) {
        category = c.name;
        break;
      }
    }

    // 3. Extract Amount (Supports "under ₹5,000", "below 5000", "up to 10,000", "max ₹8000")
    const amountRegex = /(?:under|below|up\s*to|max|budget\s*of|for|within)?\s*(?:₹|rs\.?|inr)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]{1,2})?)\s*(?:₹|rs\.?|inr)?/i;
    const amountMatch = text.match(/(?:under|below|up to|max|within|<=|<)\s*(?:₹|rs\.?|inr)?\s*([0-9,]+)/i) ||
                        text.match(/(?:₹|rs\.?|inr)\s*([0-9,]+)/i);

    if (amountMatch && amountMatch[1]) {
      const rawNum = amountMatch[1].replace(/,/g, '');
      const parsedNum = parseFloat(rawNum);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        maxAmount = Math.round(parsedNum * 100); // convert to paise
      }
    }

    // 4. Extract Product Name
    const productPatterns = [
      { name: 'Logitech K380 Keyboard', regex: /\b(logitech\s*(?:k380\s*)?keyboard|keyboard)\b/i },
      { name: 'Wireless Mouse', regex: /\b(mouse|wireless mouse)\b/i },
      { name: '4K Monitor', regex: /\b(monitor|display|screen)\b/i },
      { name: 'Flight Booking', regex: /\b(flight|airline ticket)\b/i },
      { name: 'Hotel Reservation', regex: /\b(hotel|room)\b/i },
      { name: 'Cloud Subscription', regex: /\b(cloud|aws|server|subscription)\b/i },
    ];

    for (const p of productPatterns) {
      if (p.regex.test(text)) {
        product = p.name;
        break;
      }
    }

    if (!product) {
      // Fallback extraction
      const buyMatch = text.match(/(?:buy|purchase|book|order|get)\s+(?:a|an|the)?\s*([a-zA-Z0-9\s]+?)(?:\s+(?:from|on|under|below|for|at|\$|₹))/i);
      if (buyMatch && buyMatch[1]) {
        product = buyMatch[1].trim();
      } else {
        product = 'Requested Item';
      }
    }

    return {
      merchant: merchant || 'Unknown Merchant',
      category: category || 'General',
      product,
      maxAmount: maxAmount || 500000, // default ₹5,000 if unspecified
      currency,
      validityMinutes,
      confidence: merchant && maxAmount ? 0.96 : 0.82,
      parserVersion: '1.0.0',
    };
  }
}
