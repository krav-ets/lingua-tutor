import process from 'node:process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Languages */
const languagesData = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'ru', name: 'Russian' },
];

/** en → ru collections */
const enCollectionsData = [
  {
    title: 'Basic English Words',
    desc: 'Basic English words with Russian translations',
    languageCode: 'en',
    translationLanguageCode: 'ru',
    words: {
      create: [
        { word: 'hello', translation: 'привет', transcription: 'həˈloʊ', info: {} },
        { word: 'book', translation: 'книга', transcription: 'bʊk', info: {} },
        { word: 'water', translation: 'вода', transcription: 'ˈwɔːtər', info: {} },
        { word: 'car', translation: 'машина', transcription: 'kɑːr', info: {} },
        { word: 'house', translation: 'дом', transcription: 'haʊs', info: {} },
        { word: 'table', translation: 'стол', transcription: 'ˈteɪbəl', info: {} },
        { word: 'food', translation: 'еда', transcription: 'fuːd', info: {} },
      ],
    },
  },
  {
    title: 'Colors in English',
    desc: 'Colors in English with Russian translations',
    languageCode: 'en',
    translationLanguageCode: 'ru',
    words: {
      create: [
        { word: 'red', translation: 'красный', transcription: 'rɛd', info: {} },
        { word: 'blue', translation: 'синий', transcription: 'bluː', info: {} },
        { word: 'green', translation: 'зелёный', transcription: 'ɡriːn', info: {} },
        { word: 'yellow', translation: 'жёлтый', transcription: 'ˈjɛloʊ', info: {} },
        { word: 'black', translation: 'чёрный', transcription: 'blæk', info: {} },
        { word: 'white', translation: 'белый', transcription: 'waɪt', info: {} },
        { word: 'purple', translation: 'фиолетовый', transcription: 'ˈpɜːrpəl', info: {} },
      ],
    },
  },
  {
    title: 'Animals in English',
    desc: 'Common animals in English with Russian translations',
    languageCode: 'en',
    translationLanguageCode: 'ru',
    words: {
      create: [
        { word: 'dog', translation: 'собака', transcription: 'dɔːɡ', info: {} },
        { word: 'cat', translation: 'кошка', transcription: 'kæt', info: {} },
        { word: 'bird', translation: 'птица', transcription: 'bɜːrd', info: {} },
        { word: 'horse', translation: 'лошадь', transcription: 'hɔːrs', info: {} },
        { word: 'cow', translation: 'корова', transcription: 'kaʊ', info: {} },
        { word: 'fox', translation: 'лиса', transcription: 'fɒks', info: {} },
        { word: 'sheep', translation: 'овца', transcription: 'ʃiːp', info: {} },
      ],
    },
  },
];

/** es → ru collections */
const esCollectionsData = [
  {
    title: 'Palabras básicas en español',
    desc: 'Palabras básicas en español con traducción al ruso',
    languageCode: 'es',
    translationLanguageCode: 'ru',
    words: {
      create: [
        { word: 'hola', translation: 'привет', transcription: 'ˈo.la', info: {} },
        { word: 'libro', translation: 'книга', transcription: 'ˈli.bɾo', info: {} },
        { word: 'agua', translation: 'вода', transcription: 'ˈa.ɡwa', info: {} },
        { word: 'coche', translation: 'машина', transcription: 'ˈko.tʃe', info: {} },
        { word: 'casa', translation: 'дом', transcription: 'ˈka.sa', info: {} },
        { word: 'mesa', translation: 'стол', transcription: 'ˈme.sa', info: {} },
        { word: 'comida', translation: 'еда', transcription: 'koˈmi.ða', info: {} },
      ],
    },
  },
  {
    title: 'Colores en español',
    desc: 'Colores en español con traducción al ruso',
    languageCode: 'es',
    translationLanguageCode: 'ru',
    words: {
      create: [
        { word: 'rojo', translation: 'красный', transcription: 'ˈro.xo', info: {} },
        { word: 'azul', translation: 'синий', transcription: 'aˈθul', info: {} },
        { word: 'verde', translation: 'зелёный', transcription: 'ˈbeɾ.ðe', info: {} },
        { word: 'amarillo', translation: 'жёлтый', transcription: 'a.maˈɾi.ʝo', info: {} },
        { word: 'negro', translation: 'чёрный', transcription: 'ˈne.ɡɾo', info: {} },
        { word: 'blanco', translation: 'белый', transcription: 'ˈblaŋ.ko', info: {} },
        { word: 'morado', translation: 'фиолетовый', transcription: 'moˈɾa.ðo', info: {} },
      ],
    },
  },
  {
    title: 'Animales en español',
    desc: 'Animales comunes en español con traducción al ruso',
    languageCode: 'es',
    translationLanguageCode: 'ru',
    words: {
      create: [
        { word: 'perro', translation: 'собака', transcription: 'ˈpe.ro', info: {} },
        { word: 'gato', translation: 'кошка', transcription: 'ˈɡa.to', info: {} },
        { word: 'pájaro', translation: 'птица', transcription: 'ˈpa.xa.ɾo', info: {} },
        { word: 'caballo', translation: 'лошадь', transcription: 'kaˈba.ʝo', info: {} },
        { word: 'vaca', translation: 'корова', transcription: 'ˈba.ka', info: {} },
        { word: 'zorro', translation: 'лиса', transcription: 'ˈso.ro', info: {} },
        { word: 'oveja', translation: 'овца', transcription: 'oˈβe.xa', info: {} },
      ],
    },
  },
];

async function main() {
  // Upsert languages (en, es, ru)
  for (const lang of languagesData) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: {
        code: lang.code,
        name: lang.name,
      },
    });
  }

  // upsert collection for en → ru
  for (const collectionData of enCollectionsData) {
    const { title, languageCode, translationLanguageCode } = collectionData;
    await prisma.wordCollection.upsert({
      where: {
        title_languageCode_translationLanguageCode: {
          title,
          languageCode,
          translationLanguageCode,
        },
      },
      update: {},
      create: collectionData,
    });
  }

  // upsert collection for es → ru
  for (const collectionData of esCollectionsData) {
    const { title, languageCode, translationLanguageCode } = collectionData;
    await prisma.wordCollection.upsert({
      where: {
        title_languageCode_translationLanguageCode: {
          title,
          languageCode,
          translationLanguageCode,
        },
      },
      update: {},
      create: collectionData,
    });
  }

  // eslint-disable-next-line no-console
  console.info('-Seed completed successfully-');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
