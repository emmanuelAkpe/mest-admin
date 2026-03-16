const COUNTRY_CODES: Record<string, string> = {
  'Afghanistan': 'AF', 'Albania': 'AL', 'Algeria': 'DZ', 'Angola': 'AO', 'Argentina': 'AR',
  'Australia': 'AU', 'Austria': 'AT', 'Bangladesh': 'BD', 'Belgium': 'BE', 'Benin': 'BJ',
  'Botswana': 'BW', 'Brazil': 'BR', 'Burkina Faso': 'BF', 'Burundi': 'BI', 'Cameroon': 'CM',
  'Canada': 'CA', 'Cape Verde': 'CV', 'Central African Republic': 'CF', 'Chad': 'TD',
  'Chile': 'CL', 'China': 'CN', 'Colombia': 'CO', 'Comoros': 'KM', 'Congo': 'CG',
  'Democratic Republic of the Congo': 'CD', "Côte d'Ivoire": 'CI', 'Ivory Coast': 'CI',
  'Denmark': 'DK', 'Djibouti': 'DJ', 'Egypt': 'EG', 'Eritrea': 'ER', 'Ethiopia': 'ET',
  'Finland': 'FI', 'France': 'FR', 'Gabon': 'GA', 'Gambia': 'GM', 'Germany': 'DE',
  'Ghana': 'GH', 'Greece': 'GR', 'Guinea': 'GN', 'Guinea-Bissau': 'GW',
  'India': 'IN', 'Indonesia': 'ID', 'Iran': 'IR', 'Iraq': 'IQ', 'Ireland': 'IE',
  'Israel': 'IL', 'Italy': 'IT', 'Jamaica': 'JM', 'Japan': 'JP', 'Jordan': 'JO',
  'Kenya': 'KE', 'Lebanon': 'LB', 'Lesotho': 'LS', 'Liberia': 'LR', 'Libya': 'LY',
  'Madagascar': 'MG', 'Malawi': 'MW', 'Mali': 'ML', 'Mauritania': 'MR', 'Mauritius': 'MU',
  'Mexico': 'MX', 'Morocco': 'MA', 'Mozambique': 'MZ', 'Namibia': 'NA', 'Netherlands': 'NL',
  'New Zealand': 'NZ', 'Niger': 'NE', 'Nigeria': 'NG', 'Norway': 'NO', 'Pakistan': 'PK',
  'Philippines': 'PH', 'Poland': 'PL', 'Portugal': 'PT', 'Rwanda': 'RW', 'Senegal': 'SN',
  'Sierra Leone': 'SL', 'Somalia': 'SO', 'South Africa': 'ZA', 'South Korea': 'KR',
  'South Sudan': 'SS', 'Spain': 'ES', 'Sudan': 'SD', 'Sweden': 'SE', 'Switzerland': 'CH',
  'Tanzania': 'TZ', 'Togo': 'TG', 'Tunisia': 'TN', 'Turkey': 'TR',
  'Uganda': 'UG', 'United Kingdom': 'GB', 'UK': 'GB', 'United States': 'US', 'USA': 'US',
  'Zambia': 'ZM', 'Zimbabwe': 'ZW',
}

export function countryFlag(country: string): string {
  const code = COUNTRY_CODES[country]
  if (!code) return ''
  return [...code].map((c) => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}
