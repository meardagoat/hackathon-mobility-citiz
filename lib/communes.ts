// Les 28 communes de Bordeaux Métropole (code INSEE → nom), pour afficher des noms plutôt que des codes.
export const COMMUNES: Record<string, string> = {
  '33003': 'Ambarès-et-Lagrave',
  '33004': 'Ambès',
  '33013': 'Artigues-près-Bordeaux',
  '33032': 'Bassens',
  '33039': 'Bègles',
  '33056': 'Blanquefort',
  '33063': 'Bordeaux',
  '33065': 'Bouliac',
  '33069': 'Le Bouscat',
  '33075': 'Bruges',
  '33096': 'Carbon-Blanc',
  '33119': 'Cenon',
  '33162': 'Eysines',
  '33167': 'Floirac',
  '33192': 'Gradignan',
  '33200': 'Le Haillan',
  '33249': 'Lormont',
  '33273': 'Martignas-sur-Jalle',
  '33281': 'Mérignac',
  '33312': 'Parempuyre',
  '33318': 'Pessac',
  '33376': 'Saint-Aubin-de-Médoc',
  '33434': 'Saint-Louis-de-Montferrand',
  '33449': 'Saint-Médard-en-Jalles',
  '33487': 'Saint-Vincent-de-Paul',
  '33519': 'Le Taillan-Médoc',
  '33522': 'Talence',
  '33550': "Villenave-d'Ornon",
};

export function communeName(code: string | null | undefined): string {
  if (!code) return 'Commune inconnue';
  return COMMUNES[code] ?? `Commune ${code}`;
}
