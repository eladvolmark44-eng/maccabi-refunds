// קודי ערים/שדות (IATA) ושמות בעברית. Travelpayouts עובד עם קודי ערים (ROM, LON, PAR...).
export const DESTINATIONS = {
  ATH: 'אתונה', SKG: 'סלוניקי', RHO: 'רודוס', HER: 'כרתים (הרקליון)', JTR: 'סנטוריני', JMK: 'מיקונוס', CFU: 'קורפו',
  LCA: 'לרנקה', PFO: 'פאפוס',
  ROM: 'רומא', MIL: 'מילאנו', VCE: 'ונציה', NAP: 'נאפולי', BLQ: 'בולוניה', FLR: 'פירנצה',
  PAR: 'פריז', NCE: 'ניס', MRS: 'מרסיי', LON: 'לונדון', AMS: 'אמסטרדם', BER: 'ברלין', MUC: 'מינכן', FRA: 'פרנקפורט',
  BCN: 'ברצלונה', MAD: 'מדריד', LIS: 'ליסבון',
  BUD: 'בודפשט', PRG: 'פראג', VIE: 'וינה', WAW: 'ורשה', KRK: 'קרקוב', BUH: 'בוקרשט', SOF: 'סופיה', BEG: 'בלגרד',
  TBS: 'טביליסי', BUS: 'באטומי', EVN: 'ירוואן', IST: 'איסטנבול', DXB: 'דובאי', AUH: 'אבו דאבי',
  TIV: 'טיבאט', DBV: 'דוברובניק', SPU: 'ספליט', ZAG: 'זאגרב', LJU: 'לובליאנה', TIA: 'טירנה',
  RMI: 'רימיני', CTA: 'קטניה', PMO: 'פלרמו', BRI: 'בארי', MLA: 'מלטה',
  TLV: 'תל אביב', ETM: 'אילת (רמון)',
};

export const GROUPS = {
  'יוון וקפריסין': ['ATH', 'SKG', 'RHO', 'HER', 'LCA', 'PFO'],
  'ערים באירופה': ['ROM', 'MIL', 'PAR', 'LON', 'BER', 'AMS', 'BCN', 'VIE'],
  'מזרח אירופה': ['BUD', 'PRG', 'WAW', 'KRK', 'BUH', 'SOF', 'BEG'],
  'קרוב וזול': ['ATH', 'LCA', 'BUD', 'BUH', 'SOF', 'TBS', 'RHO', 'TIA'],
};

export const nameOf = (code) => DESTINATIONS[code] || code;
