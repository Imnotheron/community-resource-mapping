/**
 * JSON utility functions for safely parsing and validating JSON data
 */

/**
 * Parse vulnerability types from a JSON string safely
 * @param jsonStr - Stringified JSON array of vulnerability types
 * @returns Array of vulnerability type strings
 */
export function safeParseVulnerabilityTypes(jsonStr: string | null): string[] {
  if (!jsonStr) return []

  try {
    const parsed = JSON.parse(jsonStr)
    
    // If it's already an array, return it
    if (Array.isArray(parsed)) {
      return parsed
    }

    // If it's a single string, wrap in array
    if (typeof parsed === 'string') {
      return [parsed]
    }

    // Default return empty array
    return []
  } catch (error) {
    console.error('Error parsing vulnerability types:', error)
    return []
  }
}

/**
 * Safely get a value from a JSON object or string
 * @param json - JSON object or string
 * @param key - Key to extract
 * @param defaultValue - Default value if key not found
 * @returns Extracted value or default
 */
export function safeGetJsonValue(json: string | object, key: string, defaultValue: any = null): any {
  try {
    if (typeof json === 'string') {
      const parsed = JSON.parse(json)
      return parsed[key] ?? defaultValue
    }
    
    if (typeof json === 'object' && key in json) {
      return json[key]
    }
    
    return defaultValue
  } catch (error) {
    console.error(`Error extracting ${key} from JSON:`, error)
    return defaultValue
  }
}

/**
 * Safely parse a JSON string
 * @param jsonStr - Stringified JSON object
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed object or defaultValue
 */
export function safeParseJson<T = any>(jsonStr: string, defaultValue: T): T {
  if (!jsonStr) return defaultValue
  
  try {
    return JSON.parse(jsonStr) as T
  } catch (error) {
    console.error('Error parsing JSON:', error)
    return defaultValue
  }
}

/**
 * Convert a value to a string safely
 * @param value - Any value to convert
 * @returns String representation
 */
export function safeString(value: any): string {
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * Check if a string is valid JSON
 * @param str - String to check
 * @returns Boolean indicating if valid JSON
 */
export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

const jsonUtils = {
  safeParseVulnerabilityTypes,
  safeGetJsonValue,
  safeParseJson,
  safeString,
  isValidJson
}

export default jsonUtils
