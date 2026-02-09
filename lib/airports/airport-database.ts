/**
 * Airport Database
 *
 * Static database of airports commonly used in private jet charter,
 * with IATA-to-ICAO mappings and city-to-airport resolution maps.
 */

import type { Airport } from './types';

/**
 * Database of 50+ airports commonly used for private jet charter.
 * Prioritizes private jet-friendly airports (FBOs) over commercial hubs.
 */
export const AIRPORTS: Airport[] = [
  // ============================================
  // NEW YORK METRO AREA
  // ============================================
  {
    icao: 'KTEB',
    iata: 'TEB',
    name: 'Teterboro Airport',
    city: 'Teterboro',
    state: 'NJ',
    country: 'US',
    latitude: 40.8501,
    longitude: -74.0608,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Teterboro', 'TEB', 'NYC Private', 'New York Private'],
  },
  {
    icao: 'KHPN',
    iata: 'HPN',
    name: 'Westchester County Airport',
    city: 'White Plains',
    state: 'NY',
    country: 'US',
    latitude: 41.0670,
    longitude: -73.7076,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Westchester', 'White Plains', 'HPN'],
  },
  {
    icao: 'KFRG',
    iata: 'FRG',
    name: 'Republic Airport',
    city: 'Farmingdale',
    state: 'NY',
    country: 'US',
    latitude: 40.7288,
    longitude: -73.4134,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['Republic', 'Farmingdale', 'Long Island'],
  },
  {
    icao: 'KJFK',
    iata: 'JFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    state: 'NY',
    country: 'US',
    latitude: 40.6413,
    longitude: -73.7781,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 4,
    aliases: ['JFK', 'Kennedy', 'New York JFK'],
  },
  {
    icao: 'KLGA',
    iata: 'LGA',
    name: 'LaGuardia Airport',
    city: 'New York',
    state: 'NY',
    country: 'US',
    latitude: 40.7769,
    longitude: -73.8740,
    timezone: 'America/New_York',
    isPrivateJetFriendly: false,
    priority: 5,
    aliases: ['LaGuardia', 'LGA'],
  },
  {
    icao: 'KEWR',
    iata: 'EWR',
    name: 'Newark Liberty International Airport',
    city: 'Newark',
    state: 'NJ',
    country: 'US',
    latitude: 40.6895,
    longitude: -74.1745,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 6,
    aliases: ['Newark', 'EWR', 'Liberty'],
  },

  // ============================================
  // LOS ANGELES AREA
  // ============================================
  {
    icao: 'KVNY',
    iata: 'VNY',
    name: 'Van Nuys Airport',
    city: 'Van Nuys',
    state: 'CA',
    country: 'US',
    latitude: 34.2098,
    longitude: -118.4900,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Van Nuys', 'VNY', 'LA Private'],
  },
  {
    icao: 'KSMO',
    iata: 'SMO',
    name: 'Santa Monica Airport',
    city: 'Santa Monica',
    state: 'CA',
    country: 'US',
    latitude: 34.0158,
    longitude: -118.4513,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Santa Monica', 'SMO'],
  },
  {
    icao: 'KBUR',
    iata: 'BUR',
    name: 'Hollywood Burbank Airport',
    city: 'Burbank',
    state: 'CA',
    country: 'US',
    latitude: 34.2007,
    longitude: -118.3585,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['Burbank', 'BUR', 'Hollywood Burbank', 'Bob Hope'],
  },
  {
    icao: 'KLAX',
    iata: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    state: 'CA',
    country: 'US',
    latitude: 33.9425,
    longitude: -118.4081,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 4,
    aliases: ['LAX', 'Los Angeles International'],
  },
  {
    icao: 'KSNA',
    iata: 'SNA',
    name: 'John Wayne Airport',
    city: 'Santa Ana',
    state: 'CA',
    country: 'US',
    latitude: 33.6757,
    longitude: -117.8682,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 5,
    aliases: ['John Wayne', 'Orange County', 'SNA', 'Santa Ana'],
  },

  // ============================================
  // MIAMI / SOUTH FLORIDA
  // ============================================
  {
    icao: 'KOPF',
    iata: 'OPF',
    name: 'Miami-Opa Locka Executive Airport',
    city: 'Opa-locka',
    state: 'FL',
    country: 'US',
    latitude: 25.9070,
    longitude: -80.2784,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Opa Locka', 'OPF', 'Miami Executive', 'Miami Private'],
  },
  {
    icao: 'KFXE',
    iata: 'FXE',
    name: 'Fort Lauderdale Executive Airport',
    city: 'Fort Lauderdale',
    state: 'FL',
    country: 'US',
    latitude: 26.1973,
    longitude: -80.1707,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Fort Lauderdale Executive', 'FXE'],
  },
  {
    icao: 'KMIA',
    iata: 'MIA',
    name: 'Miami International Airport',
    city: 'Miami',
    state: 'FL',
    country: 'US',
    latitude: 25.7959,
    longitude: -80.2870,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['MIA', 'Miami International'],
  },
  {
    icao: 'KFLL',
    iata: 'FLL',
    name: 'Fort Lauderdale-Hollywood International Airport',
    city: 'Fort Lauderdale',
    state: 'FL',
    country: 'US',
    latitude: 26.0726,
    longitude: -80.1527,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 4,
    aliases: ['Fort Lauderdale', 'FLL', 'Hollywood'],
  },
  {
    icao: 'KPBI',
    iata: 'PBI',
    name: 'Palm Beach International Airport',
    city: 'West Palm Beach',
    state: 'FL',
    country: 'US',
    latitude: 26.6832,
    longitude: -80.0956,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Palm Beach', 'West Palm Beach', 'PBI', 'West Palm'],
  },

  // ============================================
  // CHICAGO AREA
  // ============================================
  {
    icao: 'KPWK',
    iata: 'PWK',
    name: 'Chicago Executive Airport',
    city: 'Wheeling',
    state: 'IL',
    country: 'US',
    latitude: 42.1142,
    longitude: -87.9015,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Palwaukee', 'Chicago Executive', 'PWK', 'Wheeling'],
  },
  {
    icao: 'KDPA',
    iata: 'DPA',
    name: 'DuPage Airport',
    city: 'West Chicago',
    state: 'IL',
    country: 'US',
    latitude: 41.9078,
    longitude: -88.2486,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['DuPage', 'West Chicago', 'DPA'],
  },
  {
    icao: 'KORD',
    iata: 'ORD',
    name: "Chicago O'Hare International Airport",
    city: 'Chicago',
    state: 'IL',
    country: 'US',
    latitude: 41.9742,
    longitude: -87.9073,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ["O'Hare", 'ORD', 'Chicago International'],
  },
  {
    icao: 'KMDW',
    iata: 'MDW',
    name: 'Chicago Midway International Airport',
    city: 'Chicago',
    state: 'IL',
    country: 'US',
    latitude: 41.7868,
    longitude: -87.7522,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 4,
    aliases: ['Midway', 'MDW'],
  },

  // ============================================
  // LAS VEGAS
  // ============================================
  {
    icao: 'KVGT',
    iata: 'VGT',
    name: 'North Las Vegas Airport',
    city: 'North Las Vegas',
    state: 'NV',
    country: 'US',
    latitude: 36.2107,
    longitude: -115.1944,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['North Las Vegas', 'VGT', 'Vegas Private'],
  },
  {
    icao: 'KHND',
    iata: 'HND',
    name: 'Henderson Executive Airport',
    city: 'Henderson',
    state: 'NV',
    country: 'US',
    latitude: 35.9728,
    longitude: -115.1343,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Henderson', 'HND'],
  },
  {
    icao: 'KLAS',
    iata: 'LAS',
    name: 'Harry Reid International Airport',
    city: 'Las Vegas',
    state: 'NV',
    country: 'US',
    latitude: 36.0840,
    longitude: -115.1537,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['Las Vegas', 'LAS', 'McCarran', 'Harry Reid'],
  },

  // ============================================
  // SAN FRANCISCO BAY AREA
  // ============================================
  {
    icao: 'KPAO',
    iata: null,
    name: 'Palo Alto Airport',
    city: 'Palo Alto',
    state: 'CA',
    country: 'US',
    latitude: 37.4611,
    longitude: -122.1150,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Palo Alto', 'Silicon Valley'],
  },
  {
    icao: 'KSJC',
    iata: 'SJC',
    name: 'San Jose International Airport',
    city: 'San Jose',
    state: 'CA',
    country: 'US',
    latitude: 37.3626,
    longitude: -121.9291,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['San Jose', 'SJC', 'Mineta'],
  },
  {
    icao: 'KSFO',
    iata: 'SFO',
    name: 'San Francisco International Airport',
    city: 'San Francisco',
    state: 'CA',
    country: 'US',
    latitude: 37.6213,
    longitude: -122.3790,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['SFO', 'San Francisco International'],
  },
  {
    icao: 'KOAK',
    iata: 'OAK',
    name: 'Oakland International Airport',
    city: 'Oakland',
    state: 'CA',
    country: 'US',
    latitude: 37.7213,
    longitude: -122.2208,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 4,
    aliases: ['Oakland', 'OAK'],
  },

  // ============================================
  // DALLAS / FORT WORTH
  // ============================================
  {
    icao: 'KADS',
    iata: 'ADS',
    name: 'Addison Airport',
    city: 'Addison',
    state: 'TX',
    country: 'US',
    latitude: 32.9686,
    longitude: -96.8364,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Addison', 'ADS', 'Dallas Private'],
  },
  {
    icao: 'KDAL',
    iata: 'DAL',
    name: 'Dallas Love Field',
    city: 'Dallas',
    state: 'TX',
    country: 'US',
    latitude: 32.8471,
    longitude: -96.8518,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Love Field', 'DAL', 'Dallas Love'],
  },
  {
    icao: 'KDFW',
    iata: 'DFW',
    name: 'Dallas/Fort Worth International Airport',
    city: 'Dallas',
    state: 'TX',
    country: 'US',
    latitude: 32.8998,
    longitude: -97.0403,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['DFW', 'Dallas Fort Worth'],
  },
  {
    icao: 'KFTW',
    iata: 'FTW',
    name: 'Fort Worth Meacham International Airport',
    city: 'Fort Worth',
    state: 'TX',
    country: 'US',
    latitude: 32.8198,
    longitude: -97.3624,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Meacham', 'Fort Worth', 'FTW'],
  },

  // ============================================
  // HOUSTON
  // ============================================
  {
    icao: 'KSGR',
    iata: 'SGR',
    name: 'Sugar Land Regional Airport',
    city: 'Sugar Land',
    state: 'TX',
    country: 'US',
    latitude: 29.6223,
    longitude: -95.6565,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Sugar Land', 'SGR', 'Houston Private'],
  },
  {
    icao: 'KHOU',
    iata: 'HOU',
    name: 'William P. Hobby Airport',
    city: 'Houston',
    state: 'TX',
    country: 'US',
    latitude: 29.6454,
    longitude: -95.2789,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Hobby', 'HOU', 'Houston Hobby'],
  },
  {
    icao: 'KIAH',
    iata: 'IAH',
    name: 'George Bush Intercontinental Airport',
    city: 'Houston',
    state: 'TX',
    country: 'US',
    latitude: 29.9902,
    longitude: -95.3368,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['Bush Intercontinental', 'IAH', 'Houston International'],
  },

  // ============================================
  // DENVER
  // ============================================
  {
    icao: 'KAPA',
    iata: 'APA',
    name: 'Centennial Airport',
    city: 'Englewood',
    state: 'CO',
    country: 'US',
    latitude: 39.5701,
    longitude: -104.8493,
    timezone: 'America/Denver',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Centennial', 'APA', 'Denver Private'],
  },
  {
    icao: 'KBJC',
    iata: 'BJC',
    name: 'Rocky Mountain Metropolitan Airport',
    city: 'Broomfield',
    state: 'CO',
    country: 'US',
    latitude: 39.9088,
    longitude: -105.1173,
    timezone: 'America/Denver',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Rocky Mountain', 'Jeffco', 'BJC', 'Broomfield'],
  },
  {
    icao: 'KDEN',
    iata: 'DEN',
    name: 'Denver International Airport',
    city: 'Denver',
    state: 'CO',
    country: 'US',
    latitude: 39.8561,
    longitude: -104.6737,
    timezone: 'America/Denver',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['DEN', 'Denver International', 'DIA'],
  },

  // ============================================
  // SEATTLE
  // ============================================
  {
    icao: 'KBFI',
    iata: 'BFI',
    name: 'Boeing Field / King County International Airport',
    city: 'Seattle',
    state: 'WA',
    country: 'US',
    latitude: 47.5300,
    longitude: -122.3019,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Boeing Field', 'BFI', 'King County', 'Seattle Private'],
  },
  {
    icao: 'KSEA',
    iata: 'SEA',
    name: 'Seattle-Tacoma International Airport',
    city: 'Seattle',
    state: 'WA',
    country: 'US',
    latitude: 47.4502,
    longitude: -122.3088,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['SeaTac', 'SEA', 'Seattle Tacoma'],
  },

  // ============================================
  // BOSTON
  // ============================================
  {
    icao: 'KBED',
    iata: 'BED',
    name: 'Laurence G. Hanscom Field',
    city: 'Bedford',
    state: 'MA',
    country: 'US',
    latitude: 42.4700,
    longitude: -71.2890,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Hanscom', 'Bedford', 'BED', 'Boston Private'],
  },
  {
    icao: 'KBOS',
    iata: 'BOS',
    name: 'Boston Logan International Airport',
    city: 'Boston',
    state: 'MA',
    country: 'US',
    latitude: 42.3656,
    longitude: -71.0096,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Logan', 'BOS', 'Boston Logan'],
  },

  // ============================================
  // ATLANTA
  // ============================================
  {
    icao: 'KPDK',
    iata: 'PDK',
    name: 'DeKalb-Peachtree Airport',
    city: 'Atlanta',
    state: 'GA',
    country: 'US',
    latitude: 33.8756,
    longitude: -84.3020,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Peachtree', 'DeKalb', 'PDK', 'Atlanta Private'],
  },
  {
    icao: 'KFTY',
    iata: 'FTY',
    name: 'Fulton County Airport - Brown Field',
    city: 'Atlanta',
    state: 'GA',
    country: 'US',
    latitude: 33.7791,
    longitude: -84.5214,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Fulton County', 'Brown Field', 'FTY'],
  },
  {
    icao: 'KATL',
    iata: 'ATL',
    name: 'Hartsfield-Jackson Atlanta International Airport',
    city: 'Atlanta',
    state: 'GA',
    country: 'US',
    latitude: 33.6407,
    longitude: -84.4277,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['Hartsfield', 'ATL', 'Atlanta International'],
  },

  // ============================================
  // PHOENIX / SCOTTSDALE
  // ============================================
  {
    icao: 'KSDL',
    iata: 'SDL',
    name: 'Scottsdale Airport',
    city: 'Scottsdale',
    state: 'AZ',
    country: 'US',
    latitude: 33.6229,
    longitude: -111.9107,
    timezone: 'America/Phoenix',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Scottsdale', 'SDL', 'Phoenix Private'],
  },
  {
    icao: 'KDVT',
    iata: 'DVT',
    name: 'Phoenix Deer Valley Airport',
    city: 'Phoenix',
    state: 'AZ',
    country: 'US',
    latitude: 33.6883,
    longitude: -112.0825,
    timezone: 'America/Phoenix',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Deer Valley', 'DVT'],
  },
  {
    icao: 'KPHX',
    iata: 'PHX',
    name: 'Phoenix Sky Harbor International Airport',
    city: 'Phoenix',
    state: 'AZ',
    country: 'US',
    latitude: 33.4373,
    longitude: -112.0078,
    timezone: 'America/Phoenix',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['Sky Harbor', 'PHX', 'Phoenix International'],
  },

  // ============================================
  // POPULAR DESTINATIONS
  // ============================================
  {
    icao: 'KASE',
    iata: 'ASE',
    name: 'Aspen/Pitkin County Airport',
    city: 'Aspen',
    state: 'CO',
    country: 'US',
    latitude: 39.2232,
    longitude: -106.8689,
    timezone: 'America/Denver',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Aspen', 'ASE', 'Pitkin County'],
  },
  {
    icao: 'KEGE',
    iata: 'EGE',
    name: 'Eagle County Regional Airport',
    city: 'Vail',
    state: 'CO',
    country: 'US',
    latitude: 39.6426,
    longitude: -106.9177,
    timezone: 'America/Denver',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Vail', 'Eagle', 'EGE', 'Eagle County'],
  },
  {
    icao: 'KTEX',
    iata: 'TEX',
    name: 'Telluride Regional Airport',
    city: 'Telluride',
    state: 'CO',
    country: 'US',
    latitude: 37.9538,
    longitude: -107.9085,
    timezone: 'America/Denver',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Telluride', 'TEX'],
  },
  {
    icao: 'KMVY',
    iata: 'MVY',
    name: "Martha's Vineyard Airport",
    city: "Martha's Vineyard",
    state: 'MA',
    country: 'US',
    latitude: 41.3930,
    longitude: -70.6143,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ["Martha's Vineyard", 'MVY', 'The Vineyard'],
  },
  {
    icao: 'KACK',
    iata: 'ACK',
    name: 'Nantucket Memorial Airport',
    city: 'Nantucket',
    state: 'MA',
    country: 'US',
    latitude: 41.2531,
    longitude: -70.0602,
    timezone: 'America/New_York',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Nantucket', 'ACK'],
  },
  {
    icao: 'KPSP',
    iata: 'PSP',
    name: 'Palm Springs International Airport',
    city: 'Palm Springs',
    state: 'CA',
    country: 'US',
    latitude: 33.8303,
    longitude: -116.5067,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Palm Springs', 'PSP'],
  },
  {
    icao: 'KTRM',
    iata: 'TRM',
    name: 'Jacqueline Cochran Regional Airport',
    city: 'Thermal',
    state: 'CA',
    country: 'US',
    latitude: 33.6267,
    longitude: -116.1596,
    timezone: 'America/Los_Angeles',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Thermal', 'TRM', 'Coachella Valley', 'Jacqueline Cochran'],
  },
  {
    icao: 'KAUS',
    iata: 'AUS',
    name: 'Austin-Bergstrom International Airport',
    city: 'Austin',
    state: 'TX',
    country: 'US',
    latitude: 30.1945,
    longitude: -97.6699,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Austin', 'AUS', 'Bergstrom'],
  },
  {
    icao: 'KSAT',
    iata: 'SAT',
    name: 'San Antonio International Airport',
    city: 'San Antonio',
    state: 'TX',
    country: 'US',
    latitude: 29.5337,
    longitude: -98.4698,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['San Antonio', 'SAT'],
  },
  {
    icao: 'KMSP',
    iata: 'MSP',
    name: 'Minneapolis-Saint Paul International Airport',
    city: 'Minneapolis',
    state: 'MN',
    country: 'US',
    latitude: 44.8848,
    longitude: -93.2223,
    timezone: 'America/Chicago',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Minneapolis', 'MSP', 'Twin Cities', 'Saint Paul'],
  },
  {
    icao: 'KDTW',
    iata: 'DTW',
    name: 'Detroit Metropolitan Airport',
    city: 'Detroit',
    state: 'MI',
    country: 'US',
    latitude: 42.2124,
    longitude: -83.3534,
    timezone: 'America/Detroit',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Detroit', 'DTW', 'Metro Detroit'],
  },
  {
    icao: 'KPTK',
    iata: 'PTK',
    name: 'Oakland County International Airport',
    city: 'Pontiac',
    state: 'MI',
    country: 'US',
    latitude: 42.6655,
    longitude: -83.4185,
    timezone: 'America/Detroit',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Pontiac', 'PTK', 'Oakland County', 'Detroit Private'],
  },

  // ============================================
  // EUROPE
  // ============================================
  {
    icao: 'EGGW',
    iata: 'LTN',
    name: 'London Luton Airport',
    city: 'Luton',
    state: '',
    country: 'GB',
    latitude: 51.8747,
    longitude: -0.3683,
    timezone: 'Europe/London',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Luton', 'LTN', 'London Luton'],
  },
  {
    icao: 'LFPB',
    iata: 'LBG',
    name: 'Paris Le Bourget Airport',
    city: 'Paris',
    state: '',
    country: 'FR',
    latitude: 48.9694,
    longitude: 2.4414,
    timezone: 'Europe/Paris',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Le Bourget', 'LBG', 'Paris Private'],
  },
  {
    icao: 'EGLF',
    iata: 'FAB',
    name: 'Farnborough Airport',
    city: 'Farnborough',
    state: '',
    country: 'GB',
    latitude: 51.2758,
    longitude: -0.7764,
    timezone: 'Europe/London',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Farnborough', 'FAB', 'London Farnborough'],
  },
  {
    icao: 'EGLL',
    iata: 'LHR',
    name: 'London Heathrow Airport',
    city: 'London',
    state: '',
    country: 'GB',
    latitude: 51.4700,
    longitude: -0.4543,
    timezone: 'Europe/London',
    isPrivateJetFriendly: true,
    priority: 3,
    aliases: ['Heathrow', 'LHR', 'London Heathrow'],
  },
  {
    icao: 'LFPG',
    iata: 'CDG',
    name: 'Paris Charles de Gaulle Airport',
    city: 'Paris',
    state: '',
    country: 'FR',
    latitude: 49.0097,
    longitude: 2.5479,
    timezone: 'Europe/Paris',
    isPrivateJetFriendly: true,
    priority: 2,
    aliases: ['Charles de Gaulle', 'CDG', 'Roissy'],
  },
  {
    icao: 'LSGG',
    iata: 'GVA',
    name: 'Geneva Airport',
    city: 'Geneva',
    state: '',
    country: 'CH',
    latitude: 46.2381,
    longitude: 6.1089,
    timezone: 'Europe/Zurich',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Geneva', 'GVA', 'Geneve'],
  },
  {
    icao: 'LSZH',
    iata: 'ZRH',
    name: 'Zurich Airport',
    city: 'Zurich',
    state: '',
    country: 'CH',
    latitude: 47.4647,
    longitude: 8.5492,
    timezone: 'Europe/Zurich',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Zurich', 'ZRH', 'Kloten'],
  },
  {
    icao: 'EDDM',
    iata: 'MUC',
    name: 'Munich Airport',
    city: 'Munich',
    state: '',
    country: 'DE',
    latitude: 48.3538,
    longitude: 11.7861,
    timezone: 'Europe/Berlin',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Munich', 'MUC', 'Franz Josef Strauss'],
  },
  {
    icao: 'LIML',
    iata: 'LIN',
    name: 'Milan Linate Airport',
    city: 'Milan',
    state: '',
    country: 'IT',
    latitude: 45.4451,
    longitude: 9.2765,
    timezone: 'Europe/Rome',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Linate', 'LIN', 'Milan Linate'],
  },
  {
    icao: 'LEMD',
    iata: 'MAD',
    name: 'Madrid-Barajas Airport',
    city: 'Madrid',
    state: '',
    country: 'ES',
    latitude: 40.4936,
    longitude: -3.5668,
    timezone: 'Europe/Madrid',
    isPrivateJetFriendly: true,
    priority: 1,
    aliases: ['Barajas', 'MAD', 'Madrid Barajas'],
  },
];

/**
 * City name to ICAO code mapping.
 * Airports are listed in priority order (first = preferred for private jets).
 */
export const CITY_TO_AIRPORTS: Map<string, string[]> = new Map([
  // New York area
  ['new york', ['KTEB', 'KHPN', 'KFRG', 'KJFK', 'KLGA', 'KEWR']],
  ['nyc', ['KTEB', 'KHPN', 'KFRG', 'KJFK', 'KLGA', 'KEWR']],
  ['manhattan', ['KTEB', 'KJFK', 'KLGA']],
  ['teterboro', ['KTEB']],
  ['white plains', ['KHPN']],
  ['westchester', ['KHPN']],
  ['newark', ['KEWR']],

  // Los Angeles area
  ['los angeles', ['KVNY', 'KSMO', 'KBUR', 'KLAX', 'KSNA']],
  ['la', ['KVNY', 'KSMO', 'KBUR', 'KLAX']],
  ['van nuys', ['KVNY']],
  ['santa monica', ['KSMO']],
  ['burbank', ['KBUR']],
  ['orange county', ['KSNA']],

  // Miami / South Florida
  ['miami', ['KOPF', 'KFXE', 'KMIA', 'KFLL']],
  ['fort lauderdale', ['KFXE', 'KFLL']],
  ['palm beach', ['KPBI']],
  ['west palm', ['KPBI']],
  ['west palm beach', ['KPBI']],
  ['south florida', ['KOPF', 'KFXE', 'KMIA', 'KFLL', 'KPBI']],

  // Chicago area
  ['chicago', ['KPWK', 'KDPA', 'KORD', 'KMDW']],
  ['wheeling', ['KPWK']],

  // Las Vegas
  ['las vegas', ['KVGT', 'KHND', 'KLAS']],
  ['vegas', ['KVGT', 'KHND', 'KLAS']],
  ['henderson', ['KHND']],

  // San Francisco Bay Area
  ['san francisco', ['KPAO', 'KSJC', 'KSFO', 'KOAK']],
  ['sf', ['KPAO', 'KSJC', 'KSFO', 'KOAK']],
  ['bay area', ['KPAO', 'KSJC', 'KSFO', 'KOAK']],
  ['silicon valley', ['KPAO', 'KSJC']],
  ['palo alto', ['KPAO']],
  ['san jose', ['KSJC']],
  ['oakland', ['KOAK']],

  // Dallas / Fort Worth
  ['dallas', ['KADS', 'KDAL', 'KDFW']],
  ['dfw', ['KDFW', 'KADS', 'KDAL']],
  ['fort worth', ['KFTW', 'KDFW']],
  ['addison', ['KADS']],

  // Houston
  ['houston', ['KSGR', 'KHOU', 'KIAH']],
  ['sugar land', ['KSGR']],

  // Denver
  ['denver', ['KAPA', 'KBJC', 'KDEN']],
  ['centennial', ['KAPA']],

  // Seattle
  ['seattle', ['KBFI', 'KSEA']],
  ['tacoma', ['KSEA']],

  // Boston
  ['boston', ['KBED', 'KBOS']],
  ['bedford', ['KBED']],

  // Atlanta
  ['atlanta', ['KPDK', 'KFTY', 'KATL']],
  ['peachtree', ['KPDK']],

  // Phoenix / Scottsdale
  ['phoenix', ['KSDL', 'KDVT', 'KPHX']],
  ['scottsdale', ['KSDL']],

  // Popular destinations
  ['aspen', ['KASE']],
  ['vail', ['KEGE']],
  ['telluride', ['KTEX']],
  ["martha's vineyard", ['KMVY']],
  ['the vineyard', ['KMVY']],
  ['nantucket', ['KACK']],
  ['palm springs', ['KPSP', 'KTRM']],
  ['coachella', ['KTRM']],
  ['austin', ['KAUS']],
  ['san antonio', ['KSAT']],
  ['minneapolis', ['KMSP']],
  ['twin cities', ['KMSP']],
  ['detroit', ['KPTK', 'KDTW']],
  ['pontiac', ['KPTK']],

  // Europe
  ['london', ['EGGW', 'EGLF', 'EGLL']],
  ['luton', ['EGGW']],
  ['farnborough', ['EGLF']],
  ['heathrow', ['EGLL']],
  ['paris', ['LFPB', 'LFPG']],
  ['le bourget', ['LFPB']],
  ['geneva', ['LSGG']],
  ['zurich', ['LSZH']],
  ['munich', ['EDDM']],
  ['milan', ['LIML']],
  ['madrid', ['LEMD']],
]);

/**
 * IATA (3-letter) to ICAO (4-letter) code mapping.
 */
export const IATA_TO_ICAO: Map<string, string> = new Map([
  // New York area
  ['TEB', 'KTEB'],
  ['HPN', 'KHPN'],
  ['FRG', 'KFRG'],
  ['JFK', 'KJFK'],
  ['LGA', 'KLGA'],
  ['EWR', 'KEWR'],

  // Los Angeles area
  ['VNY', 'KVNY'],
  ['SMO', 'KSMO'],
  ['BUR', 'KBUR'],
  ['LAX', 'KLAX'],
  ['SNA', 'KSNA'],

  // Miami / South Florida
  ['OPF', 'KOPF'],
  ['FXE', 'KFXE'],
  ['MIA', 'KMIA'],
  ['FLL', 'KFLL'],
  ['PBI', 'KPBI'],

  // Chicago area
  ['PWK', 'KPWK'],
  ['DPA', 'KDPA'],
  ['ORD', 'KORD'],
  ['MDW', 'KMDW'],

  // Las Vegas
  ['VGT', 'KVGT'],
  ['HND', 'KHND'],
  ['LAS', 'KLAS'],

  // San Francisco Bay Area
  ['SJC', 'KSJC'],
  ['SFO', 'KSFO'],
  ['OAK', 'KOAK'],

  // Dallas / Fort Worth
  ['ADS', 'KADS'],
  ['DAL', 'KDAL'],
  ['DFW', 'KDFW'],
  ['FTW', 'KFTW'],

  // Houston
  ['SGR', 'KSGR'],
  ['HOU', 'KHOU'],
  ['IAH', 'KIAH'],

  // Denver
  ['APA', 'KAPA'],
  ['BJC', 'KBJC'],
  ['DEN', 'KDEN'],

  // Seattle
  ['BFI', 'KBFI'],
  ['SEA', 'KSEA'],

  // Boston
  ['BED', 'KBED'],
  ['BOS', 'KBOS'],

  // Atlanta
  ['PDK', 'KPDK'],
  ['FTY', 'KFTY'],
  ['ATL', 'KATL'],

  // Phoenix / Scottsdale
  ['SDL', 'KSDL'],
  ['DVT', 'KDVT'],
  ['PHX', 'KPHX'],

  // Popular destinations
  ['ASE', 'KASE'],
  ['EGE', 'KEGE'],
  ['TEX', 'KTEX'],
  ['MVY', 'KMVY'],
  ['ACK', 'KACK'],
  ['PSP', 'KPSP'],
  ['TRM', 'KTRM'],
  ['AUS', 'KAUS'],
  ['SAT', 'KSAT'],
  ['MSP', 'KMSP'],
  ['DTW', 'KDTW'],
  ['PTK', 'KPTK'],

  // Europe
  ['LTN', 'EGGW'],
  ['LBG', 'LFPB'],
  ['FAB', 'EGLF'],
  ['LHR', 'EGLL'],
  ['CDG', 'LFPG'],
  ['GVA', 'LSGG'],
  ['ZRH', 'LSZH'],
  ['MUC', 'EDDM'],
  ['LIN', 'LIML'],
  ['MAD', 'LEMD'],
]);

/**
 * Lookup airport by ICAO code.
 */
export function getAirportByIcao(icao: string): Airport | undefined {
  return AIRPORTS.find((a) => a.icao === icao.toUpperCase());
}

/**
 * Lookup airport by IATA code.
 */
export function getAirportByIata(iata: string): Airport | undefined {
  const icao = IATA_TO_ICAO.get(iata.toUpperCase());
  if (!icao) return undefined;
  return getAirportByIcao(icao);
}

/**
 * Get airports for a city name.
 */
export function getAirportsForCity(city: string): Airport[] {
  const icaoCodes = CITY_TO_AIRPORTS.get(city.toLowerCase());
  if (!icaoCodes) return [];
  return icaoCodes
    .map((code) => getAirportByIcao(code))
    .filter((a): a is Airport => a !== undefined);
}

/**
 * Convert IATA code to ICAO code.
 */
export function iataToIcao(iata: string): string | undefined {
  return IATA_TO_ICAO.get(iata.toUpperCase());
}

/**
 * Check if a code is a valid ICAO code in our database.
 */
export function isValidIcao(code: string): boolean {
  return AIRPORTS.some((a) => a.icao === code.toUpperCase());
}

/**
 * Check if a code is a valid IATA code in our database.
 */
export function isValidIata(code: string): boolean {
  return IATA_TO_ICAO.has(code.toUpperCase());
}
