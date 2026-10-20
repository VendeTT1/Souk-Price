// Product catalog: ids are stored in the database, names are shown per language.
// Later this can be replaced by an API call; only the shape { id, category, unit, names } matters.

export const CATEGORIES = ['vegetables', 'fruits', 'meat', 'fish', 'poultry', 'eggs'];

const i = (id, category, unit, en, fr, ar) => ({ id, category, unit, names: { en, fr, ar } });

export const ITEMS = [
  // vegetables
  i('tomato', 'vegetables', 'kg', 'Tomato', 'Tomate', 'طماطم'),
  i('potato', 'vegetables', 'kg', 'Potato', 'Pomme de terre', 'بطاطس'),
  i('onion', 'vegetables', 'kg', 'Onion', 'Oignon', 'بصل'),
  i('carrot', 'vegetables', 'kg', 'Carrot', 'Carotte', 'جزر'),
  i('zucchini', 'vegetables', 'kg', 'Zucchini', 'Courgette', 'كوسة'),
  i('eggplant', 'vegetables', 'kg', 'Eggplant', 'Aubergine', 'باذنجان'),
  i('bell-pepper', 'vegetables', 'kg', 'Bell pepper', 'Poivron', 'فلفل حلو'),
  i('cucumber', 'vegetables', 'kg', 'Cucumber', 'Concombre', 'خيار'),
  i('garlic', 'vegetables', 'kg', 'Garlic', 'Ail', 'ثوم'),
  i('lettuce', 'vegetables', 'unit', 'Lettuce', 'Laitue', 'خس'),
  i('cauliflower', 'vegetables', 'kg', 'Cauliflower', 'Chou-fleur', 'قرنبيط'),
  i('green-beans', 'vegetables', 'kg', 'Green beans', 'Haricots verts', 'لوبيا خضراء'),
  // fruits
  i('orange', 'fruits', 'kg', 'Orange', 'Orange', 'برتقال'),
  i('banana', 'fruits', 'kg', 'Banana', 'Banane', 'موز'),
  i('apple', 'fruits', 'kg', 'Apple', 'Pomme', 'تفاح'),
  i('lemon', 'fruits', 'kg', 'Lemon', 'Citron', 'ليمون'),
  i('strawberry', 'fruits', 'kg', 'Strawberry', 'Fraise', 'فراولة'),
  i('watermelon', 'fruits', 'kg', 'Watermelon', 'Pastèque', 'دلاح'),
  i('melon', 'fruits', 'kg', 'Melon', 'Melon', 'شمام'),
  i('grapes', 'fruits', 'kg', 'Grapes', 'Raisin', 'عنب'),
  i('pear', 'fruits', 'kg', 'Pear', 'Poire', 'إجاص'),
  i('avocado', 'fruits', 'kg', 'Avocado', 'Avocat', 'أفوكا'),
  i('dates', 'fruits', 'kg', 'Dates', 'Dattes', 'تمر'),
  // meat
  i('beef', 'meat', 'kg', 'Beef', 'Bœuf', 'لحم البقر'),
  i('minced-beef', 'meat', 'kg', 'Minced beef', 'Viande hachée', 'لحم مفروم'),
  i('lamb', 'meat', 'kg', 'Lamb', 'Agneau', 'لحم الغنم'),
  i('veal', 'meat', 'kg', 'Veal', 'Veau', 'لحم العجل'),
  i('liver', 'meat', 'kg', 'Liver', 'Foie', 'كبدة'),
  i('merguez', 'meat', 'kg', 'Merguez', 'Merguez', 'مرقاز'),
  // fish
  i('sardines', 'fish', 'kg', 'Sardines', 'Sardines', 'سردين'),
  i('hake', 'fish', 'kg', 'Hake', 'Merlu', 'مارلو'),
  i('sole', 'fish', 'kg', 'Sole', 'Sole', 'سول'),
  i('mackerel', 'fish', 'kg', 'Mackerel', 'Maquereau', 'ماكرو'),
  i('sea-bream', 'fish', 'kg', 'Sea bream', 'Dorade', 'دوراد'),
  i('shrimp', 'fish', 'kg', 'Shrimp', 'Crevettes', 'كروفيت'),
  i('squid', 'fish', 'kg', 'Squid', 'Calamar', 'كالمار'),
  // poultry
  i('chicken-whole', 'poultry', 'kg', 'Whole chicken', 'Poulet entier', 'دجاج كامل'),
  i('chicken-breast', 'poultry', 'kg', 'Chicken breast', 'Blanc de poulet', 'صدر الدجاج'),
  i('chicken-thighs', 'poultry', 'kg', 'Chicken thighs', 'Cuisses de poulet', 'أفخاذ الدجاج'),
  i('turkey', 'poultry', 'kg', 'Turkey', 'Dinde', 'ديك رومي'),
  i('rabbit', 'poultry', 'kg', 'Rabbit', 'Lapin', 'أرنب'),
  // eggs
  i('eggs', 'eggs', 'unit', 'Eggs (per egg)', 'Œufs (à l’unité)', 'بيض (للبيضة)'),
  i('eggs-baladi', 'eggs', 'unit', 'Country eggs (per egg)', 'Œufs beldi (à l’unité)', 'بيض بلدي (للبيضة)'),
];

export const itemsByCategory = (category) => ITEMS.filter((x) => x.category === category);
export const getItem = (id) => ITEMS.find((x) => x.id === id);
export const itemName = (id, lang) => getItem(id)?.names[lang] ?? id;
