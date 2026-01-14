// Utility functions for insurance calculations and validations

/**
 * Calculate insurance premium based on flight details
 */
export function calculatePremium(
  flightNumber: string,
  date: string,
  basePrice = 12,
): {
  premium: number
  compensation: number
} {
  const dateObj = new Date(date)
  const dayOfWeek = dateObj.getDay()

  // Higher risk on weekends and holidays
  const weekendMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.2 : 1

  // Some airlines have historically higher delay rates
  const airlineCode = flightNumber.slice(0, 2).toUpperCase()
  const airlineRisk: Record<string, number> = {
    AF: 1.1, // Air France
    LH: 1.0, // Lufthansa
    BA: 1.05, // British Airways
    KL: 1.0, // KLM
    IB: 1.15, // Iberia
    LX: 1.0, // Swiss
    AZ: 1.1, // Alitalia/ITA
    OS: 1.0, // Austrian
    SK: 1.05, // SAS
    TP: 1.1, // TAP Portugal
  }
  const airlineMultiplier = airlineRisk[airlineCode] || 1.0

  // Seasonal adjustment (summer months have more delays)
  const month = dateObj.getMonth()
  const seasonalMultiplier = month >= 5 && month <= 8 ? 1.15 : 1.0

  const premium = Math.round(basePrice * weekendMultiplier * airlineMultiplier * seasonalMultiplier)
  const compensation = premium * 10 // 10x multiplier for payout

  return { premium, compensation }
}

/**
 * Validate IBAN format
 */
export function validateIBAN(iban: string): boolean {
  const cleanIban = iban.replace(/\s/g, "").toUpperCase()

  // Basic length check
  if (cleanIban.length < 15 || cleanIban.length > 34) {
    return false
  }

  // Check if starts with valid country code
  const countryCode = cleanIban.substring(0, 2)
  const validCountries = [
    "FR",
    "DE",
    "GB",
    "ES",
    "IT",
    "NL",
    "BE",
    "AT",
    "CH",
    "LU",
    "PT",
    "IE",
    "DK",
    "SE",
    "NO",
    "FI",
  ]

  return validCountries.includes(countryCode)
}

/**
 * Format IBAN with spaces
 */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, "").toUpperCase()
  const chunks = cleaned.match(/.{1,4}/g)
  return chunks ? chunks.join(" ") : cleaned
}

/**
 * Validate flight number format
 */
export function validateFlightNumber(flightNumber: string): boolean {
  const cleanedFlight = flightNumber.replace(/\s/g, "").toUpperCase()
  // 2-3 letter airline code + 1-4 digit flight number
  const flightRegex = /^[A-Z]{2,3}\d{1,4}$/
  return flightRegex.test(cleanedFlight)
}

/**
 * Generate a unique contract ID
 */
export function generateContractId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = "FS-"
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate a mock Ethereum transaction hash
 */
export function generateTxHash(): string {
  const chars = "0123456789abcdef"
  let result = "0x"
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Check if a flight is eligible for insurance
 */
export function isFlightEligible(
  flightNumber: string,
  date: string,
): {
  eligible: boolean
  reason?: string
} {
  const eligibleAirlines = ["AF", "LH", "BA", "KL", "IB", "LX", "AZ", "OS", "SK", "TP"]

  // Validate format
  if (!validateFlightNumber(flightNumber)) {
    return { eligible: false, reason: "Format de numéro de vol invalide" }
  }

  // Check date
  const flightDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (flightDate < today) {
    return { eligible: false, reason: "La date du vol doit être dans le futur" }
  }

  // Check airline
  const airlineCode = flightNumber.slice(0, 2).toUpperCase()
  if (!eligibleAirlines.includes(airlineCode)) {
    return { eligible: false, reason: "Cette compagnie aérienne n'est pas couverte actuellement" }
  }

  return { eligible: true }
}
