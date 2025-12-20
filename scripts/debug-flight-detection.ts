/**
 * Debug Flight Detection Logic
 *
 * Tests the hasFlightDetails regex logic to understand why tools aren't being called.
 */

const testMessage = "I need to book a flight from Teterboro (KTEB) to Van Nuys (KVNY) for 4 passengers on January 20, 2025. Please search for available aircraft and create an RFP."

console.log('\n🔍 Debug Flight Detection Logic\n')
console.log('Original message:', testMessage)

const messageText = testMessage.toLowerCase()
console.log('\nLowercase message:', messageText)

// Test each condition
const hasAirportCodes = messageText.includes('kteb') || messageText.includes('teterboro') ||
  messageText.includes('kvny') || messageText.includes('van nuys') ||
  messageText.includes('klax') || messageText.includes('kjfk') ||
  /[a-z]{4}/.test(messageText)

console.log('\n✈️  Airport detection:')
console.log('  - includes "kteb":', messageText.includes('kteb'))
console.log('  - includes "teterboro":', messageText.includes('teterboro'))
console.log('  - includes "kvny":', messageText.includes('kvny'))
console.log('  - includes "van nuys":', messageText.includes('van nuys'))
console.log('  - /[a-z]{4}/ match:', /[a-z]{4}/.test(messageText))
console.log('  → hasAirportCodes:', hasAirportCodes)

const hasPassengers = messageText.includes('passenger') || /\d+\s*(pax|people|person)/.test(messageText)

console.log('\n👥 Passenger detection:')
console.log('  - includes "passenger":', messageText.includes('passenger'))
console.log('  - /\\d+\\s*(pax|people|person)/:', /\d+\s*(pax|people|person)/.test(messageText))
console.log('  → hasPassengers:', hasPassengers)

const hasDate = messageText.includes('202') || messageText.includes('january') ||
  messageText.includes('february') || messageText.includes('march') ||
  /\d{1,2}[\/\-]\d{1,2}/.test(messageText)

console.log('\n📅 Date detection:')
console.log('  - includes "202":', messageText.includes('202'))
console.log('  - includes "january":', messageText.includes('january'))
console.log('  - /\\d{1,2}[\\/\\-]\\d{1,2}/:', /\d{1,2}[\/\-]\d{1,2}/.test(messageText))
console.log('  → hasDate:', hasDate)

const hasFlightDetails = hasAirportCodes && hasPassengers && hasDate

console.log('\n🎯 FINAL RESULT:')
console.log('  hasFlightDetails =', hasFlightDetails)

const wantsRFP = messageText.includes('rfp') || messageText.includes('quote') ||
  messageText.includes('book') || messageText.includes('proceed')

console.log('  wantsRFP =', wantsRFP)

const toolChoice = hasFlightDetails || wantsRFP ? 'required' : 'auto'
console.log('\n  → toolChoice should be:', toolChoice)

export {}
