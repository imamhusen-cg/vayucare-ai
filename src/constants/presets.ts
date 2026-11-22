import type { DemoPreset } from '../types';

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'delhi-family',
    label: 'Delhi household',
    icon: 'users',
    description: 'Children and senior resident, natural ventilation only',
    city: 'Delhi',
    profile: {
      city: 'Delhi',
      hasKids: true,
      hasSenior: true,
      hasRespiratoryIssues: false,
      commuteMode: 'Car with AC',
      hasAirPurifier: false,
    },
  },
  {
    id: 'mumbai-commuter',
    label: 'Mumbai transit commuter',
    icon: 'train',
    description: 'Daily public transit, mild asthma exposure profile',
    city: 'Mumbai',
    profile: {
      city: 'Mumbai',
      hasKids: false,
      hasSenior: false,
      hasRespiratoryIssues: true,
      commuteMode: 'Metro',
      hasAirPurifier: false,
    },
  },
  {
    id: 'kolkata-student',
    label: 'Kolkata outdoor cyclist',
    icon: 'cycle',
    description: 'Evening cyclist with HEPA air purifier at home',
    city: 'Kolkata',
    profile: {
      city: 'Kolkata',
      hasKids: false,
      hasSenior: false,
      hasRespiratoryIssues: false,
      commuteMode: 'Cycle',
      hasAirPurifier: true,
    },
  },
];

export const INDIAN_CITIES = [
  // Delhi NCR
  'Delhi', 'Noida', 'Gurugram', 'Faridabad', 'Ghaziabad', 'Greater Noida', 'Meerut',
  // Northern India
  'Agra', 'Aligarh', 'Amritsar', 'Bareilly', 'Chandigarh', 'Dehradun', 'Haridwar', 
  'Jalandhar', 'Jammu', 'Kanpur', 'Lucknow', 'Ludhiana', 'Moradabad', 'Prayagraj', 
  'Shimla', 'Srinagar', 'Varanasi',
  // Western India
  'Ahmedabad', 'Aurangabad', 'Jaipur', 'Jodhpur', 'Kota', 'Mumbai', 'Nagpur', 
  'Nashik', 'Navi Mumbai', 'Pune', 'Rajkot', 'Surat', 'Thane', 'Udaipur', 'Vadodara',
  // Southern India
  'Bengaluru', 'Chennai', 'Coimbatore', 'Guntur', 'Hubballi', 'Hyderabad', 'Kochi', 
  'Kozhikode', 'Madurai', 'Mangaluru', 'Mysuru', 'Salem', 'Thiruvananthapuram', 
  'Tiruchirappalli', 'Vijayawada', 'Visakhapatnam', 'Warangal',
  // Eastern & Central India
  'Agartala', 'Asansol', 'Bhopal', 'Bhubaneswar', 'Cuttack', 'Dhanbad', 'Gaya', 
  'Guwahati', 'Gwalior', 'Indore', 'Jabalpur', 'Jamshedpur', 'Kolkata', 'Patna', 
  'Raipur', 'Ranchi', 'Rourkela', 'Siliguri', 'Ujjain'
].sort();

export const COMMUTE_MODES = [
  'Cycle',
  'Auto/Open Transit',
  'Car with AC',
  'Metro',
  'Work From Home'
] as const;
