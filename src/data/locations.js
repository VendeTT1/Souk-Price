// Morocco regions, main cities and well-known neighborhoods.
// Neighborhood is an input with suggestions: cities not listed here still accept free text.

const l = (en, fr, ar) => ({ en, fr, ar });

export const REGIONS = [
  { id: 'casablanca-settat', names: l('Casablanca-Settat', 'Casablanca-Settat', 'الدار البيضاء سطات') },
  { id: 'rabat-sale-kenitra', names: l('Rabat-Salé-Kénitra', 'Rabat-Salé-Kénitra', 'الرباط سلا القنيطرة') },
  { id: 'marrakech-safi', names: l('Marrakech-Safi', 'Marrakech-Safi', 'مراكش آسفي') },
  { id: 'fes-meknes', names: l('Fès-Meknès', 'Fès-Meknès', 'فاس مكناس') },
  { id: 'tanger-tetouan-al-hoceima', names: l('Tanger-Tétouan-Al Hoceïma', 'Tanger-Tétouan-Al Hoceïma', 'طنجة تطوان الحسيمة') },
  { id: 'souss-massa', names: l('Souss-Massa', 'Souss-Massa', 'سوس ماسة') },
  { id: 'oriental', names: l('Oriental', 'Oriental', 'الشرق') },
  { id: 'beni-mellal-khenifra', names: l('Béni Mellal-Khénifra', 'Béni Mellal-Khénifra', 'بني ملال خنيفرة') },
  { id: 'draa-tafilalet', names: l('Drâa-Tafilalet', 'Drâa-Tafilalet', 'درعة تافيلالت') },
  { id: 'laayoune-sakia-el-hamra', names: l('Laâyoune-Sakia El Hamra', 'Laâyoune-Sakia El Hamra', 'العيون الساقية الحمراء') },
  { id: 'guelmim-oued-noun', names: l('Guelmim-Oued Noun', 'Guelmim-Oued Noun', 'كلميم واد نون') },
  { id: 'dakhla-oued-ed-dahab', names: l('Dakhla-Oued Ed-Dahab', 'Dakhla-Oued Ed-Dahab', 'الداخلة وادي الذهب') },
];

export const CITIES = [
  { id: 'casablanca', region: 'casablanca-settat', names: l('Casablanca', 'Casablanca', 'الدار البيضاء'),
    neighborhoods: ['Maarif', 'Ain Diab', 'Derb Sultan', 'Hay Hassani', 'Sidi Maarouf', 'Ain Sebaa', 'Sbata', 'Bouskoura', 'Oulfa', 'Habous'] },
  { id: 'mohammedia', region: 'casablanca-settat', names: l('Mohammedia', 'Mohammedia', 'المحمدية'), neighborhoods: [] },
  { id: 'el-jadida', region: 'casablanca-settat', names: l('El Jadida', 'El Jadida', 'الجديدة'), neighborhoods: [] },
  { id: 'settat', region: 'casablanca-settat', names: l('Settat', 'Settat', 'سطات'), neighborhoods: [] },
  { id: 'rabat', region: 'rabat-sale-kenitra', names: l('Rabat', 'Rabat', 'الرباط'),
    neighborhoods: ['Agdal', 'Hassan', 'Souissi', 'Youssoufia', 'Yacoub El Mansour', 'Océan', 'Akkari'] },
  { id: 'sale', region: 'rabat-sale-kenitra', names: l('Salé', 'Salé', 'سلا'), neighborhoods: ['Tabriquet', 'Hay Karima', 'Bettana'] },
  { id: 'kenitra', region: 'rabat-sale-kenitra', names: l('Kénitra', 'Kénitra', 'القنيطرة'), neighborhoods: [] },
  { id: 'temara', region: 'rabat-sale-kenitra', names: l('Témara', 'Témara', 'تمارة'), neighborhoods: [] },
  { id: 'marrakech', region: 'marrakech-safi', names: l('Marrakech', 'Marrakech', 'مراكش'),
    neighborhoods: ['Gueliz', 'Medina', 'Hivernage', 'Daoudiate', 'Sidi Youssef Ben Ali', 'Massira', 'Mhamid'] },
  { id: 'safi', region: 'marrakech-safi', names: l('Safi', 'Safi', 'آسفي'), neighborhoods: [] },
  { id: 'essaouira', region: 'marrakech-safi', names: l('Essaouira', 'Essaouira', 'الصويرة'), neighborhoods: [] },
  { id: 'fes', region: 'fes-meknes', names: l('Fès', 'Fès', 'فاس'),
    neighborhoods: ['Ville Nouvelle', 'Fès El Bali', 'Narjiss', 'Atlas', 'Saïss'] },
  { id: 'meknes', region: 'fes-meknes', names: l('Meknès', 'Meknès', 'مكناس'), neighborhoods: ['Hamria', 'Ville Nouvelle', 'Marjane'] },
  { id: 'tangier', region: 'tanger-tetouan-al-hoceima', names: l('Tangier', 'Tanger', 'طنجة'),
    neighborhoods: ['Malabata', 'Boukhalef', 'Iberia', 'Beni Makada', 'Centre-ville'] },
  { id: 'tetouan', region: 'tanger-tetouan-al-hoceima', names: l('Tetouan', 'Tétouan', 'تطوان'), neighborhoods: [] },
  { id: 'al-hoceima', region: 'tanger-tetouan-al-hoceima', names: l('Al Hoceima', 'Al Hoceïma', 'الحسيمة'), neighborhoods: [] },
  { id: 'agadir', region: 'souss-massa', names: l('Agadir', 'Agadir', 'أكادير'),
    neighborhoods: ['Talborjt', 'Founty', 'Hay Mohammadi', 'Anza', 'Dcheira'] },
  { id: 'taroudant', region: 'souss-massa', names: l('Taroudant', 'Taroudant', 'تارودانت'), neighborhoods: [] },
  { id: 'oujda', region: 'oriental', names: l('Oujda', 'Oujda', 'وجدة'), neighborhoods: [] },
  { id: 'nador', region: 'oriental', names: l('Nador', 'Nador', 'الناظور'), neighborhoods: [] },
  { id: 'beni-mellal', region: 'beni-mellal-khenifra', names: l('Beni Mellal', 'Béni Mellal', 'بني ملال'), neighborhoods: [] },
  { id: 'khouribga', region: 'beni-mellal-khenifra', names: l('Khouribga', 'Khouribga', 'خريبكة'), neighborhoods: [] },
  { id: 'errachidia', region: 'draa-tafilalet', names: l('Errachidia', 'Errachidia', 'الرشيدية'), neighborhoods: [] },
  { id: 'ouarzazate', region: 'draa-tafilalet', names: l('Ouarzazate', 'Ouarzazate', 'ورزازات'), neighborhoods: [] },
  { id: 'laayoune', region: 'laayoune-sakia-el-hamra', names: l('Laâyoune', 'Laâyoune', 'العيون'), neighborhoods: [] },
  { id: 'guelmim', region: 'guelmim-oued-noun', names: l('Guelmim', 'Guelmim', 'كلميم'), neighborhoods: [] },
  { id: 'dakhla', region: 'dakhla-oued-ed-dahab', names: l('Dakhla', 'Dakhla', 'الداخلة'), neighborhoods: [] },
];

export const MARKET_TYPES = ['souk', 'street', 'supermarket', 'shop'];

// Suggested names when the market type is "supermarket".
export const SUPERMARKET_CHAINS = ['Marjane', 'Carrefour', 'Aswak Assalam', 'Label’Vie', 'Acima', 'Atacadao', 'BIM', 'Uniprix'];

export const getCity = (id) => CITIES.find((c) => c.id === id);
export const getRegion = (id) => REGIONS.find((r) => r.id === id);
export const citiesOfRegion = (regionId) => CITIES.filter((c) => c.region === regionId);
export const cityName = (id, lang) => getCity(id)?.names[lang] ?? id;
export const regionName = (id, lang) => getRegion(id)?.names[lang] ?? id;
