export const FEMUR_ID = 'UBERON:0000981';

export const FEMUR_SEED = {
  id: FEMUR_ID,
  label: 'Femur',
  latinLabel: 'os femoris',
  aliases: {
    fma: 'FMA:9611',
    ta2: '1360'
  },
  status: 'procedural_proxy',
  materialHint: 'bone'
} as const;
